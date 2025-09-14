# Scholars Stack - Frontend Routes Analysis Report

## Overview
This report documents all frontend routes identified in the Scholars Stack application and provides corresponding backend route implementations.

## Frontend Routes Identified

### 1. Main Application Routes

#### Landing & Authentication
- **`/`** - Main landing page (`index.html`)
- **`/login1.html`** - Login/Registration page with OTP verification
  - Query parameters: `?mode=login` or `?mode=register`

### 2. Feature Routes (All under `/features/`)

#### Academic Tools
- **`/features/attendance/attendance.html`** - Attendance Calculator
  - Query parameters: `?sidebar=active` for sidebar activation
- **`/features/gpa-calculator/cgpa.html`** - CGPA Calculator
- **`/features/ttmaker/ttmaker1.html`** - Timetable Maker
- **`/features/mycourses/mycourses.html`** - My Courses Management

#### Campus Resources
- **`/features/mess-menu/mess.html`** - Mess Menu System
- **`/features/maps/maps.html`** - Campus Map
- **`/features/faculty/faculty.html`** - Faculty Information
- **`/features/club/club.html`** - Club Management

#### Student Services
- **`/features/profile/profile.html`** - Student Profile Dashboard
- **`/features/marketplace/market.html`** - Premium Marketplace
- **`/features/marketplace/payment.html`** - Payment Processing
- **`/features/event/event.html`** - Event Management

### 3. Static Assets
- **`/features/images/logo1.png`** - Application Logo
- **`/logo1.png`** - Main Logo (root level)

## Backend Route Implementation

### Required Backend Routes

#### Authentication Routes
```javascript
// Already exists in authRoutes.js
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/verify-otp
POST /api/v1/auth/resend-otp
POST /api/v1/auth/logout
GET /api/v1/auth/profile
PUT /api/v1/auth/profile
```

#### Feature-Specific Routes (To be added)

##### Attendance Management
```javascript
GET /api/v1/attendance/:userId
POST /api/v1/attendance/calculate
PUT /api/v1/attendance/update
GET /api/v1/attendance/history/:userId
```

##### GPA Calculator
```javascript
GET /api/v1/gpa/:userId
POST /api/v1/gpa/calculate
PUT /api/v1/gpa/update
GET /api/v1/gpa/history/:userId
```

##### Timetable Management
```javascript
GET /api/v1/timetable/:userId
POST /api/v1/timetable/create
PUT /api/v1/timetable/update/:id
DELETE /api/v1/timetable/delete/:id
GET /api/v1/timetable/export/:id
```

##### Course Management
```javascript
GET /api/v1/courses/:userId
POST /api/v1/courses/enroll
PUT /api/v1/courses/update/:id
DELETE /api/v1/courses/drop/:id
GET /api/v1/courses/schedule/:userId
```

##### Mess Menu
```javascript
GET /api/v1/mess/menu
GET /api/v1/mess/menu/:date
POST /api/v1/mess/feedback
GET /api/v1/mess/schedule
```

##### Campus Map
```javascript
GET /api/v1/map/locations
GET /api/v1/map/location/:id
POST /api/v1/map/feedback
GET /api/v1/map/navigation/:from/:to
```

##### Faculty Information
```javascript
GET /api/v1/faculty
GET /api/v1/faculty/:id
GET /api/v1/faculty/department/:dept
POST /api/v1/faculty/contact
GET /api/v1/faculty/schedule/:id
```

##### Club Management
```javascript
GET /api/v1/clubs
GET /api/v1/clubs/:id
POST /api/v1/clubs/join
POST /api/v1/clubs/leave
GET /api/v1/clubs/members/:id
POST /api/v1/clubs/events
```

##### Profile Management
```javascript
GET /api/v1/profile/:userId
PUT /api/v1/profile/update
POST /api/v1/profile/upload-avatar
GET /api/v1/profile/achievements/:userId
POST /api/v1/profile/achievements
```

##### Marketplace
```javascript
GET /api/v1/marketplace/items
GET /api/v1/marketplace/item/:id
POST /api/v1/marketplace/item
PUT /api/v1/marketplace/item/:id
DELETE /api/v1/marketplace/item/:id
POST /api/v1/marketplace/purchase
GET /api/v1/marketplace/orders/:userId
```

##### Payment Processing
```javascript
POST /api/v1/payment/create-order
POST /api/v1/payment/verify
GET /api/v1/payment/history/:userId
POST /api/v1/payment/refund
```

##### Event Management
```javascript
GET /api/v1/events
GET /api/v1/events/:id
POST /api/v1/events
PUT /api/v1/events/:id
DELETE /api/v1/events/:id
POST /api/v1/events/register
GET /api/v1/events/registered/:userId
```

## Route Categories

### 1. Public Routes (No Authentication Required)
- `/` - Landing page
- `/login1.html` - Login/Registration
- `/features/mess-menu/mess.html` - Mess menu (public)
- `/features/maps/maps.html` - Campus map (public)
- `/features/faculty/faculty.html` - Faculty info (public)
- `/features/club/club.html` - Club info (public)

### 2. Protected Routes (Authentication Required)
- `/features/profile/profile.html` - User profile
- `/features/attendance/attendance.html` - Personal attendance
- `/features/gpa-calculator/cgpa.html` - Personal GPA
- `/features/ttmaker/ttmaker1.html` - Personal timetable
- `/features/mycourses/mycourses.html` - Personal courses
- `/features/marketplace/market.html` - Marketplace access
- `/features/marketplace/payment.html` - Payment processing
- `/features/event/event.html` - Event management

### 3. Admin Routes (Admin Authentication Required)
- All CRUD operations for content management
- User management endpoints
- Analytics and reporting endpoints

## Navigation Structure

### Main Navigation (index.html)
- Home (`/`)
- Why Join? (`#why-join`)
- Testimonials (`#testimonials`)
- Resources (`/features/attendance/attendance.html`)
- Get Started (`/features/attendance/attendance.html?sidebar=active`)

### Feature Navigation (Sidebar in feature pages)
- Dashboard
- Attendance Calculator
- CGPA Calculator
- Timetable Maker
- My Courses
- Mess Menu
- Campus Map
- Faculty Info
- Club Info
- Marketplace
- Events
- Profile

## Query Parameters Used

### Authentication
- `?mode=login` - Show login form
- `?mode=register` - Show registration form

### Feature Pages
- `?sidebar=active` - Activate sidebar on page load

## Static File Serving

### Images
- `/features/images/logo1.png` - Main application logo
- `/logo1.png` - Root level logo

### CSS Files
- `/shared.css` - Shared styles
- `/shared-background.css` - Background animations
- `/style.css` - Main styles
- `/login1.css` - Login page styles
- Individual CSS files for each feature

### JavaScript Files
- `/script.js` - Main application script
- `/features/ttmaker/ttmaker1.js` - Timetable maker functionality

## Recommendations

### 1. Backend Route Implementation Priority
1. **High Priority**: Authentication, Profile, Attendance, GPA Calculator
2. **Medium Priority**: Timetable, Courses, Mess Menu, Faculty Info
3. **Low Priority**: Marketplace, Events, Club Management

### 2. Route Security
- Implement JWT-based authentication for protected routes
- Add rate limiting for public routes
- Implement CSRF protection for state-changing operations

### 3. API Documentation
- Use OpenAPI/Swagger for API documentation
- Implement proper error handling and status codes
- Add request/response validation

### 4. Frontend-Backend Integration
- Implement proper error handling in frontend
- Add loading states for async operations
- Implement proper form validation

## File Structure Summary

```
vitbsmashers/
├── frontend/
│   ├── index.html (Main landing page)
│   ├── login1.html (Authentication)
│   ├── features/
│   │   ├── attendance/attendance.html
│   │   ├── gpa-calculator/cgpa.html
│   │   ├── ttmaker/ttmaker1.html
│   │   ├── mycourses/mycourses.html
│   │   ├── mess-menu/mess.html
│   │   ├── maps/maps.html
│   │   ├── faculty/faculty.html
│   │   ├── club/club.html
│   │   ├── profile/profile.html
│   │   ├── marketplace/
│   │   │   ├── market.html
│   │   │   └── payment.html
│   │   ├── event/event.html
│   │   └── images/logo1.png
│   └── [CSS/JS files]
└── backend/
    └── [API routes to be implemented]
```

## Conclusion

This analysis provides a comprehensive overview of all frontend routes in the Scholars Stack application. The backend route implementations suggested above will provide full API coverage for all frontend functionality. The routes are organized by feature and include proper HTTP methods, authentication requirements, and parameter specifications.

Total Frontend Routes Identified: **13 main feature routes + 2 authentication routes + 1 landing page = 16 routes**

Total Backend Routes Recommended: **60+ API endpoints** covering all frontend functionality with proper CRUD operations, authentication, and business logic.
