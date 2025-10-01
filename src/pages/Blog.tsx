import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BlogSEO from "@/components/BlogSEO";

// Blog post interface
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTime: string;
  category: string;
  tags: string[];
  slug: string;
  featured: boolean;
}

// Sample blog posts focused on college admissions and essay writing
const sampleBlogPosts: BlogPost[] = [
  {
    id: "1",
    title: "How to Write a Compelling Personal Statement That Stands Out",
    excerpt: "Learn the secrets to crafting a personal statement that admissions officers will remember. Discover proven strategies for storytelling, structure, and authenticity.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-15",
    readTime: "8 min read",
    category: "Essay Writing",
    tags: ["personal statement", "college admissions", "essay tips", "storytelling"],
    slug: "how-to-write-compelling-personal-statement",
    featured: true
  },
  {
    id: "2",
    title: "Common College Essay Mistakes That Kill Your Application",
    excerpt: "Avoid these critical mistakes that can derail your college application. Learn what admissions officers really don't want to see in your essays.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-10",
    readTime: "6 min read",
    category: "Essay Writing",
    tags: ["essay mistakes", "college application", "admissions", "tips"],
    slug: "common-college-essay-mistakes",
    featured: false
  },
  {
    id: "3",
    title: "The Ultimate Guide to MBA Application Essays",
    excerpt: "Master the art of MBA essay writing with our comprehensive guide. From brainstorming to final draft, we cover everything you need to know.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-08",
    readTime: "12 min read",
    category: "MBA Applications",
    tags: ["MBA", "business school", "essay writing", "graduate school"],
    slug: "ultimate-guide-mba-application-essays",
    featured: true
  },
  {
    id: "4",
    title: "Building a Strong Resume for College Applications",
    excerpt: "Your resume is more than just a list of activities. Learn how to showcase your achievements and experiences effectively for college admissions.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-05",
    readTime: "7 min read",
    category: "Resume Building",
    tags: ["resume", "activities", "achievements", "college prep"],
    slug: "building-strong-resume-college-applications",
    featured: false
  },
  {
    id: "5",
    title: "Understanding College Admissions Deadlines: A Complete Timeline",
    excerpt: "Navigate the complex world of college application deadlines with our comprehensive timeline guide. Never miss an important date again.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-03",
    readTime: "9 min read",
    category: "Application Process",
    tags: ["deadlines", "timeline", "planning", "college prep"],
    slug: "understanding-college-admissions-deadlines",
    featured: false
  },
  {
    id: "6",
    title: "How AI is Transforming College Essay Writing",
    excerpt: "Discover how artificial intelligence is revolutionizing the way students approach essay writing while maintaining authenticity and personal voice.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-01",
    readTime: "10 min read",
    category: "Technology",
    tags: ["AI", "technology", "essay writing", "innovation"],
    slug: "how-ai-transforming-college-essay-writing",
    featured: true
  }
];

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>(sampleBlogPosts);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>(sampleBlogPosts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("");

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(posts.map(post => post.category)))];
  
  // Get all unique tags
  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));

  // Filter posts based on search term, category, and tag
  useEffect(() => {
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (selectedTag) {
      filtered = filtered.filter(post => post.tags.includes(selectedTag));
    }

    setFilteredPosts(filtered);
  }, [searchTerm, selectedCategory, selectedTag, posts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const featuredPosts = filteredPosts.filter(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <BlogSEO isBlogList={true} />
      
      {/* SEO-optimized meta tags will be handled by the parent component */}
      
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              College Admissions Blog
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert insights, tips, and strategies to help you navigate your college application journey
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="mb-2"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Tag Filter */}
          {selectedCategory === "All" && (
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              <Button
                variant={selectedTag === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag("")}
                className="mb-2"
              >
                All Tags
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="mb-2"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          )}

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPosts.map(post => (
                  <Card key={post.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                        {post.featured && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <Link to={`/blog/${post.slug}`}>
                        <Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Regular Posts */}
          {regularPosts.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Latest Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map(post => (
                  <Card key={post.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <Link to={`/blog/${post.slug}`}>
                        <Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedTag("");
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your College Application Journey?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get personalized guidance and AI-powered essay assistance with Diya AI
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="hover:shadow-lg transition-all">
              Get Started For Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Blog;
