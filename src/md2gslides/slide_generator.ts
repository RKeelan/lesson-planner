// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Debug from 'debug';
import extractSlides from './parser/extract_slides';
import {SlideDefinition} from './slides';
import matchLayout from './layout/match_layout';
import {assert} from './utils';

const debug = Debug('md2gslides');

// Types for Google Slides API responses
interface Presentation {
  presentationId?: string;
  slides?: Array<{objectId: string}>;
}

interface BatchUpdateResponse {
  presentationId: string;
  replies: any[];
}

/**
 * Generates slides from Markdown or HTML. Requires an authorized
 * access token.
 */
export default class SlideGenerator {
  private slides: SlideDefinition[] = [];
  private presentation?: Presentation;
  private accessToken: string;

  /**
   * @param {string} accessToken Authorized access token
   * @param {Object} presentation Initial presentation data
   * @private
   */
  public constructor(
    accessToken: string,
    presentation: Presentation
  ) {
    this.accessToken = accessToken;
    this.presentation = presentation;
  }

  /**
   * Returns a generator that writes to a new blank presentation.
   *
   * @param {string} accessToken User's access token
   * @param {string} title Title of presentation
   * @returns {Promise.<SlideGenerator>}
   */
  public static async newPresentation(
    accessToken: string,
    title: string
  ): Promise<SlideGenerator> {
    const response = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create presentation: ${response.statusText}`);
    }

    const presentation = await response.json();
    
    const generator = new SlideGenerator(accessToken, presentation);
    
    // Erase any default slides
    if (presentation.slides && presentation.slides.length > 0) {
      await generator.erase();
    }
    
    return generator;
  }

  /**
   * Returns a generator that copies an existing presentation.
   *
   * @param {string} accessToken User's access token
   * @param {string} title Title of presentation
   * @param {string} presentationId ID of presentation to copy
   * @returns {Promise.<SlideGenerator>}
   */
  public static async copyPresentation(
    accessToken: string,
    title: string,
    presentationId: string
  ): Promise<SlideGenerator> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to copy presentation: ${response.statusText}`);
    }

    const {id} = await response.json();
    assert(id);
    return SlideGenerator.forPresentation(accessToken, id);
  }

  /**
   * Returns a generator that writes to an existing presentation.
   *
   * @param {string} accessToken User's access token
   * @param {string} presentationId ID of presentation to use
   * @returns {Promise.<SlideGenerator>}
   */
  public static async forPresentation(
    accessToken: string,
    presentationId: string
  ): Promise<SlideGenerator> {
    const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get presentation: ${response.statusText}`);
    }

    const presentation = await response.json();
    return new SlideGenerator(accessToken, presentation);
  }

  /**
   * Generate slides from markdown
   *
   * @param {String} markdown Markdown to import
   * @returns {Promise.<String>} ID of generated slide
   */
  public async generateFromMarkdown(markdown: string): Promise<string> {
    assert(this.presentation?.presentationId);
    this.slides = extractSlides(markdown);
    
    // First create all slides
    debug('Creating slides...');
    await this.updatePresentation(this.createSlides());
    
    // Reload presentation to get new slide IDs
    debug('Reloading presentation to get new slide IDs...');
    await this.reloadPresentation();
    
    // Verify slides were created and update objectIds
    if (!this.presentation.slides || this.presentation.slides.length === 0) {
      throw new Error('Failed to create slides - no slides found after creation');
    }
    
    // Wait longer to ensure slides are fully created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now populate the slides with content
    debug('Populating slides with content...');
    await this.updatePresentation(this.populateSlides());
    
    return this.presentation.presentationId;
  }

  /**
   * Removes any existing slides from the presentation.
   *
   * @returns {Promise.<*>}
   */
  public async erase(): Promise<void> {
    debug('Erasing previous slides');
    assert(this.presentation?.presentationId);
    if (!this.presentation.slides) {
      return Promise.resolve();
    }

    const requests = this.presentation.slides.map(slide => ({
      deleteObject: {
        objectId: slide.objectId,
      },
    }));
    const batch = {requests};
    await this.updatePresentation(batch);
  }

  /**
   * 1st pass at generation -- creates slides using the appropriate
   * layout based on the content.
   *
   * Note this only returns the batch requests, but does not execute it.
   *
   * @returns {{requests: Array}}
   */
  protected createSlides(): {requests: any[]} {
    debug('Creating slides');
    const batch = {
      requests: [],
    };
    for (const slide of this.slides) {
      const layout = matchLayout(this.presentation!, slide);
      layout.appendCreateSlideRequest(batch.requests);
    }
    return batch;
  }

  /**
   * 2nd pass at generation -- fills in placeholders and adds any other
   * elements to the slides.
   *
   * Note this only returns the batch requests, but does not execute it.
   *
   * @returns {{requests: Array}}
   */
  protected populateSlides(): {requests: any[]} {
    debug('Populating slides');
    const batch = {
      requests: [],
    };
    for (const slide of this.slides) {
      const layout = matchLayout(this.presentation!, slide);
      layout.appendContentRequests(batch.requests);
    }
    return batch;
  }

  /**
   * Updates the remote presentation.
   *
   * @param batch Batch of operations to execute
   * @returns {Promise.<*>}
   */
  protected async updatePresentation(batch: {requests: any[]}): Promise<void> {
    debug('Updating presentation: %O', batch);
    debug('Presentation state: %O', this.presentation);
    assert(this.presentation?.presentationId);
    if (!batch.requests || batch.requests.length === 0) {
      return Promise.resolve();
    }

    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${this.presentation.presentationId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update presentation: ${response.statusText}\nError details: ${errorText}`);
    }

    const data = await response.json();
    debug('API response: %O', data);
  }

  /**
   * Refreshes the local copy of the presentation.
   *
   * @returns {Promise.<*>}
   */
  protected async reloadPresentation(): Promise<void> {
    assert(this.presentation?.presentationId);
    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${this.presentation.presentationId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to reload presentation: ${response.statusText}`);
    }

    this.presentation = await response.json();
  }
}
