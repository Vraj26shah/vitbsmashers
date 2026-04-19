# Course Management System

This document explains how to manage courses in the Scholars Stack marketplace using the `courses.json` configuration file.

## 📁 File Structure

```
marketplace/
├── market.html          # Main marketplace page
├── courses.json         # Course configuration file
└── README.md           # This documentation
```

## 🚀 How to Use

### 1. **Adding a New Course**

To add a new course, simply add a new entry to the `courses` object in `courses.json`:

```json
{
  "courses": {
    "CSE009": {
      "id": "CSE009",
      "title": "New Course Title",
      "image": "https://example.com/image.jpg",
      "price": "₹1,499",
      "rating": 4.8,
      "modules": 10,
      "hours": 45,
      "notes": 200,
      "tags": "cs",
      "description": "Course description here...",
      "modulesList": [
        {
          "title": "Module 1",
          "topics": "Topic 1, Topic 2, Topic 3"
        }
      ]
    }
  }
}
```

### 2. **Modifying Existing Courses**

Edit any property of an existing course in the JSON file:

```json
"CSE001": {
  "title": "Updated Course Title",
  "price": "₹1,599",
  "rating": 4.9
}
```

### 3. **Removing a Course**

Simply delete the course entry from the `courses` object:

```json
{
  "courses": {
    // Remove this course entry
    // "CSE008": { ... }
  }
}
```

### 4. **Running the System**

1. **Open the marketplace**: Navigate to `market.html` in your browser
2. **Courses load automatically**: The system will automatically load all courses from `courses.json`
3. **No server restart needed**: Changes take effect immediately when you refresh the page

## 📋 Course Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | ✅ | Unique course identifier (e.g., "CSE001") |
| `title` | string | ✅ | Course title displayed to users |
| `image` | string | ✅ | URL of the course image |
| `price` | string | ✅ | Price in ₹ format (e.g., "₹1,299") |
| `rating` | number | ❌ | Course rating (0-5, shown as stars) |
| `modules` | number | ❌ | Number of modules in the course |
| `hours` | number | ❌ | Total hours of content |
| `notes` | number | ❌ | Number of notes/pages |
| `tags` | string | ✅ | Filter tags (e.g., "cs", "eng", "math", "sci") |
| `description` | string | ✅ | Detailed course description |
| `modulesList` | array | ❌ | Array of module objects with title and topics |

## 🏷️ Filter Tags

Available filter tags for course categorization:

- `cs` - Computer Science
- `eng` - Engineering
- `math` - Mathematics
- `sci` - Sciences

## 📝 Module Structure

Each course can have a `modulesList` array:

```json
"modulesList": [
  {
    "title": "Introduction to Topic",
    "topics": "Topic 1, Topic 2, Topic 3"
  },
  {
    "title": "Advanced Concepts",
    "topics": "Advanced Topic 1, Advanced Topic 2"
  }
]
```

## 🔄 Automatic Features

### **Image Consistency**
- All courses use the same image across marketplace and my courses
- Images are automatically mapped by course ID
- No manual synchronization needed

### **Dynamic Loading**
- Courses load automatically from JSON
- No HTML changes required when adding courses
- Real-time updates when JSON is modified

### **Error Handling**
- System falls back gracefully if JSON fails to load
- Clear error messages for debugging
- Continues working even with partial data

## 🛠️ Troubleshooting

### **Courses Not Loading**
1. Check browser console for errors
2. Verify `courses.json` is in the same directory as `market.html`
3. Ensure JSON syntax is valid (use a JSON validator)
4. Check file permissions

### **Images Not Showing**
1. Verify image URLs are accessible
2. Check for HTTPS requirements in production
3. Ensure image URLs are properly formatted

### **Changes Not Reflecting**
1. Hard refresh the page (Ctrl+F5)
2. Clear browser cache
3. Check if JSON file was saved properly

## 📊 Metadata

The JSON file includes metadata for tracking:

```json
{
  "metadata": {
    "version": "1.0",
    "lastUpdated": "2025-09-20",
    "totalCourses": 8,
    "categories": ["cs", "eng", "math", "sci"]
  }
}
```

## 🎯 Best Practices

1. **Use consistent ID format**: Follow the pattern `CSE001`, `CSE002`, etc.
2. **Test image URLs**: Ensure all image URLs are accessible
3. **Validate JSON**: Use a JSON validator before saving
4. **Update metadata**: Keep the metadata section current
5. **Backup regularly**: Keep backups of your course configurations

## 🚀 Quick Start Example

To add a new Computer Science course:

```json
{
  "courses": {
    "CSE009": {
      "id": "CSE009",
      "title": "Artificial Intelligence",
      "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      "price": "₹1,799",
      "rating": 4.9,
      "modules": 12,
      "hours": 50,
      "notes": 250,
      "tags": "cs",
      "description": "Comprehensive AI course covering machine learning, neural networks, and deep learning.",
      "modulesList": [
        {
          "title": "Introduction to AI",
          "topics": "What is AI, History, Applications"
        },
        {
          "title": "Machine Learning Basics",
          "topics": "Supervised Learning, Unsupervised Learning"
        }
      ]
    }
  }
}
```

Save the file and refresh `market.html` - your new course will appear automatically! 🎉