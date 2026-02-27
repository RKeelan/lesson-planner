# Mark Slide

Markdown to Google Slides CLI.

## Commands

```bash
bun run start -- auth setup            # Configure OAuth credentials
bun run start -- auth login            # Authenticate with Google
bun run start -- auth status           # Show authentication status
bun run start -- auth logout           # Clear stored tokens
bun run start -- slides.md             # Convert markdown to slides
bun run start -- slides.md -t "Title"  # Set presentation title
bun run start -- slides.md --no-open   # Skip opening in browser
bun run typecheck                      # Type check
```
