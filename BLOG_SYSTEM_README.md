# Blog System Documentation

This document explains how to use the new file-based blog system where each blog post is its own HTML file.

## Overview

The blog system now supports:
- Individual HTML files for each blog post
- Automatic metadata extraction from HTML meta tags
- Dynamic loading of blog posts
- Automatic integration with the blog listing page
- SEO-friendly URLs and metadata

## File Structure

```
public/
├── blog-posts/
│   ├── index.json                    # List of all blog post slugs
│   ├── post-slug-1.html              # Individual blog post files
│   ├── post-slug-2.html
│   └── ...
```

## Creating a New Blog Post

### 1. Create HTML File

Create a new HTML file in the `public/blog-posts/` directory with the following naming convention:
- Use kebab-case (lowercase with hyphens)
- Descriptive slug that matches your title
- Example: `how-to-write-great-essays.html`

### 2. HTML Structure

Each blog post HTML file should follow this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Blog Post Title</title>
    <meta name="description" content="Brief description of your blog post">
    <meta name="author" content="Author Name">
    <meta name="date" content="2025-09-15">
    <meta name="read-time" content="5 min read">
    <meta name="category" content="Category Name">
    <meta name="tags" content="tag1, tag2, tag3">
    <meta name="featured" content="true">
</head>
<body>
    <article>
        <h1>Your Blog Post Title</h1>
        
        <p>Your blog post content goes here...</p>
        
        <h2>Subheading</h2>
        <p>More content...</p>
        
        <!-- Use proper HTML structure -->
        <ul>
            <li>List item 1</li>
            <li>List item 2</li>
        </ul>
        
        <p>Conclusion paragraph...</p>
    </article>
</body>
</html>
```

### 3. Required Meta Tags

The following meta tags are required for proper blog post integration:

- `title`: The blog post title
- `description`: Brief excerpt/description (150-160 characters recommended for SEO)
- `author`: Author name
- `date`: Publication date (YYYY-MM-DD format) - Use current date when creating new posts
- `read-time`: Estimated reading time (e.g., "5 min read")
- `category`: Category for filtering
- `tags`: Comma-separated list of tags
- `featured`: "true" or "false" to mark as featured post

### 4. Update Index File

Add your new blog post slug to the `public/blog-posts/index.json` file:

```json
{
  "posts": [
    "existing-post-slug",
    "your-new-post-slug"
  ]
}
```

## Content Guidelines

### HTML Structure
- Use semantic HTML elements (`<article>`, `<h1>`, `<h2>`, `<p>`, etc.)
- Keep content within the `<article>` tag
- Use proper heading hierarchy (h1 → h2 → h3)
- Include proper paragraph breaks

### Writing Style
- Write in a conversational, engaging tone
- Use subheadings to break up content
- Include relevant examples and actionable advice
- Keep paragraphs concise and scannable
- Use bullet points and lists when appropriate

### SEO Best Practices
- Include relevant keywords naturally
- Write compelling meta descriptions
- Use descriptive headings
- Include internal links to other blog posts when relevant

## Editing Existing Posts

To edit an existing blog post:

1. Open the HTML file in `public/blog-posts/`
2. Make your changes to the content within the `<article>` tag
3. Update meta tags if needed (title, description, tags, etc.)
4. Save the file

The changes will be automatically reflected on the website.

## Categories and Tags

### Categories
Use consistent category names across posts:
- Essay Writing
- MBA Applications
- Resume Building
- Application Process
- Technology
- General

### Tags
Use lowercase, descriptive tags separated by commas:
- `personal statement, college admissions, essay tips`
- `MBA, business school, graduate school`
- `resume, activities, achievements`

## Featured Posts

Mark posts as featured by setting the `featured` meta tag to "true". Featured posts appear in a special section at the top of the blog listing page.

## Troubleshooting

### Post Not Appearing
1. Check that the slug is added to `index.json`
2. Verify the HTML file is in the correct directory
3. Check browser console for any loading errors

### Metadata Not Loading
1. Ensure all required meta tags are present
2. Check that meta tag names match exactly (case-sensitive)
3. Verify meta tag content format (especially dates)

### Content Not Displaying
1. Ensure content is within `<article>` tags
2. Check for HTML syntax errors
3. Verify the file is accessible via direct URL

## Examples

See the existing blog posts for reference:
- `how-to-write-compelling-personal-statement.html`
- `common-college-essay-mistakes.html`
- `ultimate-guide-mba-application-essays.html`

## Technical Details

The blog system uses:
- Dynamic imports to load HTML files
- Metadata extraction from HTML meta tags
- React components for rendering
- SEO optimization with proper meta tags
- Responsive design with Tailwind CSS

For technical questions or issues, refer to the `blogService.ts` file in the services directory.
