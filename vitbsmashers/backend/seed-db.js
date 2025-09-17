import mongoose from 'mongoose';
import Faculty from './models/faculty.model.js';
import Event from './models/event.model.js';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27018/vitbsmashers');

    console.log('Connected to MongoDB');

    // Clear existing data
    await Faculty.deleteMany({});
    await Event.deleteMany({});
    await User.deleteMany({});

    // Create dummy admin user
    const dummyUser = await User.create({
      username: 'admin',
      email: 'admin@vitbhopal.ac.in',
      password: 'password123',
      fullName: 'Admin User',
      registrationNumber: 'ADMIN001',
      branch: 'ADMIN',
      year: '2024',
      phone: '9999999999'
    });

    console.log('Dummy admin user created');

    // Create dummy faculty
    const dummyFaculty = [
      {
        name: "Dr. John Doe",
        email: "john.doe@vitbhopal.ac.in",
        department: "CSE",
        designation: "Professor",
        phone: "9876543210",
        office: "A101",
        specialization: ["Web Development", "AI"],
        bio: "Experienced professor in Computer Science with expertise in web technologies and artificial intelligence.",
        schedule: { monday: "10:00-12:00", wednesday: "2:00-4:00" }
      },
      {
        name: "Prof. Jane Smith",
        email: "jane.smith@vitbhopal.ac.in",
        department: "ECE",
        designation: "Associate Professor",
        phone: "9876543211",
        office: "B202",
        specialization: ["Embedded Systems", "IoT"],
        bio: "Specialist in embedded systems and Internet of Things with 15+ years of teaching experience.",
        schedule: { tuesday: "11:00-1:00", thursday: "3:00-5:00" }
      },
      {
        name: "Dr. Robert Johnson",
        email: "robert.j@vitbhopal.ac.in",
        department: "ME",
        designation: "Assistant Professor",
        phone: "9876543212",
        office: "C303",
        specialization: ["Thermodynamics", "Fluid Mechanics"],
        bio: "Mechanical engineering expert with focus on thermal sciences and fluid dynamics.",
        schedule: { monday: "9:00-11:00", friday: "1:00-3:00" }
      },
      {
        name: "Prof. Sarah Williams",
        email: "sarah.w@vitbhopal.ac.in",
        department: "CSE",
        designation: "Lecturer",
        phone: "9876543213",
        office: "D404",
        specialization: ["Data Structures", "Algorithms"],
        bio: "Passionate about teaching data structures and algorithms with practical applications.",
        schedule: { wednesday: "10:00-12:00", friday: "2:00-4:00" }
      },
      {
        name: "Dr. Michael Brown",
        email: "michael.b@vitbhopal.ac.in",
        department: "IT",
        designation: "Professor",
        phone: "9876543214",
        office: "E505",
        specialization: ["Cybersecurity", "Networking"],
        bio: "Cybersecurity expert with extensive research in network security and ethical hacking.",
        schedule: { tuesday: "10:00-12:00", thursday: "2:00-4:00" }
      },
      {
        name: "Prof. Emily Davis",
        email: "emily.d@vitbhopal.ac.in",
        department: "ECE",
        designation: "Associate Professor",
        phone: "9876543215",
        office: "F606",
        specialization: ["Signal Processing", "Communication"],
        bio: "Specializes in digital signal processing and wireless communication systems.",
        schedule: { monday: "1:00-3:00", wednesday: "11:00-1:00" }
      }
    ];

    await Faculty.insertMany(dummyFaculty);
    console.log('Dummy faculty inserted');

    // Create dummy events
    const dummyEvents = [
      {
        title: "Web Development Workshop",
        description: "Learn modern web development techniques with hands-on practice. We'll cover HTML, CSS, JavaScript, and React fundamentals.",
        date: new Date('2024-12-05'),
        time: "14:00",
        location: "Tech Building, Room 305",
        category: "Workshop",
        organizer: "Dr. John Doe",
        contactEmail: "john.doe@vitbhopal.ac.in",
        capacity: 40,
        isActive: true,
        createdBy: dummyUser._id
      },
      {
        title: "Robotics Competition",
        description: "Annual robotics competition open to all students. Build and program your robot to complete challenges. Prizes for top performers!",
        date: new Date('2024-12-12'),
        time: "10:00",
        location: "Engineering Building, Main Hall",
        category: "Technical",
        organizer: "Prof. Jane Smith",
        contactEmail: "jane.smith@vitbhopal.ac.in",
        capacity: 100,
        isActive: true,
        createdBy: dummyUser._id
      },
      {
        title: "Cultural Night",
        description: "An evening of performances showcasing diverse cultures through dance, music, and drama. Food stalls representing different cuisines will be available.",
        date: new Date('2024-11-28'),
        time: "18:00",
        location: "Main Auditorium",
        category: "Cultural",
        organizer: "Dr. Robert Johnson",
        contactEmail: "robert.j@vitbhopal.ac.in",
        capacity: 300,
        isActive: true,
        createdBy: dummyUser._id
      },
      {
        title: "AI Research Seminar",
        description: "Exploring artificial intelligence through research projects, workshops, and competitions.",
        date: new Date('2024-12-20'),
        time: "13:00",
        location: "Computer Science Building, Room 101",
        category: "Seminar",
        organizer: "Dr. Michael Brown",
        contactEmail: "michael.b@vitbhopal.ac.in",
        capacity: 80,
        isActive: true,
        createdBy: dummyUser._id
      },
      {
        title: "Sports Meet",
        description: "Annual sports meet with various athletic events and competitions.",
        date: new Date('2024-12-15'),
        time: "9:00",
        location: "Sports Complex",
        category: "Sports",
        organizer: "Prof. Emily Davis",
        contactEmail: "emily.d@vitbhopal.ac.in",
        capacity: 200,
        isActive: true,
        createdBy: dummyUser._id
      }
    ];

    await Event.insertMany(dummyEvents);
    console.log('Dummy events inserted');

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();