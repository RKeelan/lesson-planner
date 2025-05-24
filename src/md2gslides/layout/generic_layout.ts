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
import {uuid} from '../utils';
import extend from 'extend';
// @ts-ignore
import Layout from 'layout';
import * as _ from 'lodash';
import {slides_v1 as SlidesV1} from 'googleapis';
import {
  SlideDefinition,
  TableDefinition,
  TextDefinition,
} from '../slides';
import {
  findLayoutIdByName,
  findPlaceholder,
  findSpeakerNotesObjectId,
} from './presentation_helpers';
import {assert} from '../utils';

const debug = Debug('md2gslides');

interface BoundingBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

/**
 * Performs most of the work of converting a slide into API requests.
 *
 */
export default class GenericLayout {
  public name: string;
  public presentation: SlidesV1.Schema$Presentation;
  private slide: SlideDefinition;

  public constructor(
    name: string,
    presentation: SlidesV1.Schema$Presentation,
    slide: SlideDefinition
  ) {
    this.name = name;
    this.presentation = presentation;
    this.slide = slide;
  }

  public appendCreateSlideRequest(
    requests: SlidesV1.Schema$Request[]
  ): SlidesV1.Schema$Request[] {
    const layoutId = findLayoutIdByName(this.presentation, this.name);
    if (!layoutId) {
      const availableLayouts = this.presentation.layouts?.map(l => l.layoutProperties?.name).filter(Boolean);
      const errorMessage = `Unable to find layout "${this.name}". Available layouts in this presentation: ${availableLayouts?.join(', ') || 'none'}`;
      throw new Error(errorMessage);
    }
    this.slide.objectId = uuid();

    debug('Creating slide %s with layout %s', this.slide.objectId, this.name);
    requests.push({
      createSlide: {
        slideLayoutReference: {
          layoutId: layoutId,
        },
        objectId: this.slide.objectId,
      },
    });
    return requests;
  }

  public appendContentRequests(
    requests: SlidesV1.Schema$Request[]
  ): SlidesV1.Schema$Request[] {
    this.appendFillPlaceholderTextRequest(this.slide.title, 'TITLE', requests);
    this.appendFillPlaceholderTextRequest(
      this.slide.title,
      'CENTERED_TITLE',
      requests
    );
    this.appendFillPlaceholderTextRequest(
      this.slide.subtitle,
      'SUBTITLE',
      requests
    );

    if (this.slide.tables.length) {
      this.appendCreateTableRequests(this.slide.tables, requests);
    }

    if (this.slide.bodies) {
      assert(this.slide.objectId);
      const bodyElements = findPlaceholder(
        this.presentation,
        this.slide.objectId,
        'BODY'
      );
      const bodyCount = Math.min(
        bodyElements?.length ?? 0,
        this.slide.bodies.length
      );
      for (let i = 0; i < bodyCount; ++i) {
        const placeholder = bodyElements![i];
        const body = this.slide.bodies[i];
        this.appendFillPlaceholderTextRequest(body.text, placeholder, requests);
      }
    }

    if (this.slide.notes) {
      assert(this.slide.objectId);
      const objectId = findSpeakerNotesObjectId(
        this.presentation,
        this.slide.objectId
      );
      const notesText: TextDefinition = {
        rawText: this.slide.notes,
        textRuns: [],
        listMarkers: [],
        big: false
      };
      this.appendInsertTextRequests(
        notesText,
        {objectId: objectId},
        requests
      );
    }

    return requests;
  }

  protected appendFillPlaceholderTextRequest(
    value: TextDefinition | undefined,
    placeholder: string | SlidesV1.Schema$PageElement,
    requests: SlidesV1.Schema$Request[]
  ): void {
    if (!value) {
      return;
    }

    if (typeof placeholder === 'string') {
      assert(this.slide.objectId);
      const pageElements = findPlaceholder(
        this.presentation,
        this.slide.objectId,
        placeholder
      );
      if (!pageElements) {
        return;
      }
      placeholder = pageElements[0];
    }

    this.appendInsertTextRequests(
      value,
      {objectId: placeholder.objectId},
      requests
    );
  }

  protected appendInsertTextRequests(
    text: TextDefinition,
    locationProps:
      | Partial<SlidesV1.Schema$UpdateTextStyleRequest>
      | Partial<SlidesV1.Schema$CreateParagraphBulletsRequest>,
    requests: SlidesV1.Schema$Request[]
  ): void {
    // Insert the raw text first
    const request = {
      insertText: extend(
        {
          text: text.rawText,
        },
        locationProps
      ),
    };
    requests.push(request);

    // Apply any text styles present.
    // Most of the work for generating the text runs
    // is performed when parsing markdown.
    for (const textRun of text.textRuns) {
      const request: SlidesV1.Schema$Request = {
        updateTextStyle: extend(
          {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: textRun.start,
              endIndex: textRun.end,
            },
            style: {
              bold: textRun.bold,
              italic: textRun.italic,
              foregroundColor: textRun.foregroundColor,
              backgroundColor: textRun.backgroundColor,
              strikethrough: textRun.strikethrough,
              underline: textRun.underline,
              smallCaps: textRun.smallCaps,
              fontFamily: textRun.fontFamily,
              fontSize: textRun.fontSize,
              link: textRun.link,
              baselineOffset: textRun.baselineOffset,
            },
          },
          locationProps
        ),
      };
      assert(request.updateTextStyle?.style);
      request.updateTextStyle.fields = this.computeShallowFieldMask(
        request.updateTextStyle.style
      );
      if (request.updateTextStyle.fields.length) {
        requests.push(request); // Only push if at least one style set
      }
    }

    // Convert paragraphs to lists.
    // Note that leading tabs for nested lists in the raw text are removed.
    // In this case, we're assuming that lists are supplied in order of
    // appearance and they're non-overlapping.
    // Processing in the reverse order avoids having to readjust indices.
    for (const listMarker of _.reverse(text.listMarkers)) {
      const request = {
        createParagraphBullets: extend(
          {
            textRange: {
              type: 'FIXED_RANGE',
              startIndex: listMarker.start,
              endIndex: listMarker.end,
            },
            bulletPreset:
              listMarker.type === 'ordered'
                ? 'NUMBERED_DIGIT_ALPHA_ROMAN'
                : 'BULLET_DISC_CIRCLE_SQUARE',
          },
          locationProps
        ),
      };
      requests.push(request);
    }
  }

  protected appendCreateTableRequests(
    tables: TableDefinition[],
    requests: SlidesV1.Schema$Request[]
  ): void {
    if (tables.length > 1) {
      throw new Error('Multiple tables per slide are not supported.');
    }
    const table = tables[0];
    const tableId = uuid();

    requests.push({
      createTable: {
        objectId: tableId,
        elementProperties: {
          pageObjectId: this.slide.objectId,
          // Use default size/transform for tables
        },
        rows: table.rows,
        columns: table.columns,
      },
    });

    for (const r in table.cells) {
      const row = table.cells[r];
      for (const c in row) {
        this.appendInsertTextRequests(
          row[c],
          {
            objectId: tableId,
            cellLocation: {
              rowIndex: parseInt(r),
              columnIndex: parseInt(c),
            },
          },
          requests
        );
      }
    }
  }

  protected calculateBoundingBox(
    element: SlidesV1.Schema$PageElement
  ): BoundingBox {
    assert(element);
    assert(element.size?.height?.magnitude);
    assert(element.size?.width?.magnitude);
    const height = element.size.height.magnitude;
    const width = element.size.width.magnitude;
    const scaleX = element.transform?.scaleX ?? 1;
    const scaleY = element.transform?.scaleY ?? 1;
    const shearX = element.transform?.shearX ?? 0;
    const shearY = element.transform?.shearY ?? 0;

    return {
      width: scaleX * width + shearX * height,
      height: scaleY * height + shearY * width,
      x: element.transform?.translateX ?? 0,
      y: element.transform?.translateY ?? 0,
    };
  }

  protected getBodyBoundingBox(
    placeholder: SlidesV1.Schema$PageElement | undefined
  ): BoundingBox {
    if (placeholder) {
      return this.calculateBoundingBox(placeholder);
    }
    assert(this.presentation.pageSize?.width?.magnitude);
    assert(this.presentation.pageSize?.height?.magnitude);
    return {
      width: this.presentation.pageSize.width.magnitude,
      height: this.presentation.pageSize.height.magnitude,
      x: 0,
      y: 0,
    };
  }

  protected computeShallowFieldMask<T extends Record<string, any>>(object: T): string {
    const fields = [];
    for (const field of Object.keys(object)) {
      if (object[field as keyof T] !== undefined) {
        fields.push(field);
      }
    }
    return fields.join(',');
  }
}
