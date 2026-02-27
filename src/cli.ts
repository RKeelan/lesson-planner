#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { Command } from 'commander';
import open from 'open';
import SlideGenerator from './md2gslides/slide_generator';
import { getAccessToken, setup, login, status, logout } from './auth';

const program = new Command();

program
  .name('mark-slide')
  .description('Convert markdown files to Google Slides presentations')
  .version('1.0.0');

// Auth subcommand
const auth = program
  .command('auth')
  .description('Manage Google authentication');

auth
  .command('setup')
  .description('Configure OAuth client credentials')
  .action(async () => {
    await setup();
  });

auth
  .command('login')
  .description('Authenticate with Google')
  .action(async () => {
    await login();
  });

auth
  .command('status')
  .description('Show authentication status')
  .action(() => {
    status();
  });

auth
  .command('logout')
  .description('Clear stored tokens')
  .action(() => {
    logout();
  });

// Main command: convert markdown to slides
program
  .argument('<file>', 'Markdown file to convert')
  .option('-t, --title <title>', 'Presentation title')
  .option('--template <id>', 'Google Slides template ID to copy')
  .option('--no-open', 'Do not open the presentation in browser')
  .action(async (file: string, options: { title?: string; template?: string; open: boolean }) => {
    try {
      const markdown = readFileSync(file, 'utf-8');
      const title = options.title || basename(file, '.md');

      const token = await getAccessToken();

      let generator;
      if (options.template) {
        try {
          generator = await SlideGenerator.copyPresentation(token, title, options.template);
        } catch {
          console.warn('Could not copy template. Creating new presentation instead.');
          generator = await SlideGenerator.newPresentation(token, title);
        }
      } else {
        generator = await SlideGenerator.newPresentation(token, title);
      }

      const presentationId = await generator.generateFromMarkdown(markdown);
      const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

      console.log(`Presentation created: ${url}`);

      if (options.open) {
        await open(url);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
