# Frontend-Backend Integration Guide

## How Frontend and Backend are Connected

### 1. **Static File Serving**
The backend serves the frontend files directly:
```javascript
// In app.js
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));
```

This means:
- **Frontend files are accessible** through the backend server
- **All HTML, CSS, JS files** are served from `http://localhost:4000/`
- **Frontend routes work** through the backend

### 2. **Frontend Routes Accessible Through Backend**

#### Main Pages
- `http://localhost:4000/` → `index.html` (Landing page)
- `http://localhost:4000/login1.html` → Login/Registration page
- `http://localhost:4000/profile.html` → Profile page (legacy route)

#### Feature Pages
- `http://localhost:4000/features/attendance/attendance.html`
- `http://localhost:4000/features/gpa-calculator/cgpa.html`
- `http://localhost:4000/features/ttmaker/ttmaker1.html`
- `http://localhost:4000/features/mycourses/mycourses.html`
- `http://localhost:4000/features/mess-menu/mess.html`
- `http://localhost:4000/features/maps/maps.html`
- `http://localhost:4000/features/faculty/faculty.html`
- `http://localhost:4000/features/club/club.html`
- `http://localhost:4000/features/profile/profile.html`
- `http://localhost:4000/features/marketplace/market.html`
- `http://localhost:4000/features/marketplace/payment.html`
- `http://localhost:4000/features/event/event.html`

### 3. **API Endpoints Available to Frontend**

#### Authentication APIs
```javascript
// Login
POST http://localhost:4000/api/v1/auth/login

// Registration
POST http://localhost:4000/api/v1/auth/signup

// OTP Verification
POST http://localhost:4000/api/v1/auth/verify-otp
```

#### Feature APIs
```javascript
// Attendance
GET http://localhost:4000/api/v1/attendance/:userId
POST http://localhost:4000/api/v1/attendance/calculate

// GPA Calculator
GET http://localhost:4000/api/v1/gpa/:userId
POST http://localhost:4000/api/v1/gpa/calculate

// Timetable
GET http://localhost:4000/api/v1/timetable/:userId
POST http://localhost:4000/api/v1/timetable/create

// And many more...
```

### 4. **How to Connect Frontend to Backend APIs**

#### Example: Attendance Calculator Integration

Add this JavaScript to your frontend pages:

```javascript
// API Base URL
const API_BASE_URL = 'http://localhost:4000/api/v1';

// Function to call attendance API
async function calculateAttendance(attendanceData) {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // JWT token
            },
            body: JSON.stringify(attendanceData)
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error calculating attendance:', error);
        return { error: 'Failed to calculate attendance' };
    }
}

// Function to get user attendance
async function getUserAttendance(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return { error: 'Failed to fetch attendance' };
    }
}
```

#### Example: Login Integration

```javascript
// Login function
async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Store token for future API calls
            localStorage.setItem('token', result.data.token);
            // Redirect to profile or dashboard
            window.location.href = '/features/profile/profile.html';
        } else {
            alert('Login failed: ' + result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}
```

### 5. **CORS Configuration**

The backend is configured to allow frontend requests:
```javascript
// In app.js
app.use(cors({ origin: true, credentials: true }));
```

This allows:
- **Cross-origin requests** from frontend to backend
- **Cookie-based authentication** if needed
- **All HTTP methods** (GET, POST, PUT, DELETE)

### 6. **File Structure Integration**

```
vitbsmashers/
├── frontend/                    # Frontend files
│   ├── index.html              # → http://localhost:4000/
│   ├── login1.html             # → http://localhost:4000/login1.html
│   └── features/               # → http://localhost:4000/features/
│       ├── attendance/         # → http://localhost:4000/features/attendance/
│       ├── gpa-calculator/     # → http://localhost:4000/features/gpa-calculator/
│       └── ...
└── backend/                    # Backend files
    ├── app.js                  # Main server file
    ├── routes/                 # API routes
    └── controllers/            # API logic
```

### 7. **Testing the Integration**

#### Start the Backend Server
```bash
cd vitbsmashers/backend
npm start
```

#### Access Frontend Through Backend
- Open browser and go to `http://localhost:4000`
- All frontend pages will be accessible
- API endpoints will be available at `http://localhost:4000/api/v1/...`

#### Test API Endpoints
```bash
# Test attendance API
curl -X GET http://localhost:4000/api/v1/attendance/user123

# Test login API
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### 8. **Next Steps for Full Integration**

1. **Add JavaScript to frontend pages** to call backend APIs
2. **Implement authentication flow** (login/logout)
3. **Add form submissions** that send data to backend
4. **Implement real-time updates** using WebSockets if needed
5. **Add error handling** for API failures
6. **Implement loading states** for better UX

## Summary

✅ **Frontend and Backend are fully linked**
✅ **All frontend routes are accessible through backend**
✅ **All API endpoints are available for frontend use**
✅ **CORS is configured for cross-origin requests**
✅ **Static file serving is working**
✅ **Ready for full integration with JavaScript API calls**

The backend serves as both the API server and the web server for the frontend, making it a complete full-stack application.
