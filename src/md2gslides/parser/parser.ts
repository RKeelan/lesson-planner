// Copyright 2019 Google Inc.
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

import markdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import lazyHeaders from 'markdown-it-lazy-headers';
import {full as emoji} from 'markdown-it-emoji';
import expandTabs from 'markdown-it-expand-tabs';

const mdOptions = {
  html: true,
  langPrefix: 'highlight ',
  linkify: false,
  breaks: false,
};

const parser = markdownIt(mdOptions)
  .use(attrs)
  .use(lazyHeaders)
  .use(emoji, {shortcuts: {}})
  .use(expandTabs, {tabWidth: 4})

function parseMarkdown(markdown: string): ReturnType<typeof parser.parse> {
  return parser.parse(markdown, {});
}

export default parseMarkdown;
