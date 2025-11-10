# Uniform Policy & Student Data Flow Documentation

## Overview
This document outlines the complete data flow architecture for uniform policies and student management in the Monisha Inventory Management System. Use this as a blueprint for implementing the web version.

## 📊 Database Collections Structure

### 1. Schools Collection (`schools`)
```json
{
  "id": "schoolId123",
  "name": "School Name",
  "address": "School Address",
  "students": [
    {
      "id": "studentId456",
      "name": "Student Name",
      "level": "Senior",
      "gender": "Boys"
    }
  ],
  "uniformPolicy": [
    {
      "id": "policyId789",
      "uniformId": "uniformId123",
      "uniformName": "Blazer",
      "uniformType": "Blazer",
      "level": "Senior",
      "gender": "Boys",
      "isRequired": true,
      "quantityPerStudent": 2,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2. Students Collection (`students`)
```json
{
  "id": "studentId456",
  "schoolId": "schoolId123",  // Links to school
  "name": "John Doe",
  "level": "Senior",
  "gender": "Boys",
  "uniformLog": [
    {
      "id": "logId123",
      "uniformId": "uniformId123",
      "uniformName": "Blazer",
      "size": "32",
      "quantityReceived": 1,
      "sizeNotAvailable": false,
      "sizeWanted": null,
      "loggedAt": "2025-01-01T00:00:00.000Z",
      "loggedBy": "userId123"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "createdBy": "userId123"
}
```

### 3. Uniforms Collection (`uniforms`)
```json
{
  "id": "uniformId123",
  "name": "Blazer",
  "type": "Blazer",
  "category": "School Uniform",
  "gender": "Male",
  "level": "SENIOR",
  "school": "schoolId123",  // Links to school
  "variants": [
    {
      "id": "variantId456",
      "color": "grey",
      "variant": "barathea",
      "sizes": [
        {
          "size": "32",
          "quantity": "10",
          "price": "45"
        }
      ]
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 🔄 Data Flow Architecture

### 1. School Creation Flow
```
User Creates School
    ↓
School Document Created in `schools` collection
    ↓
School ID generated (used for linking)
    ↓
Empty arrays initialized:
    - students: []
    - uniformPolicy: []
```

### 2. Student Management Flow

#### Adding Students
```
User Adds Student to School
    ↓
Student Document Created in `students` collection
    - schoolId: links to school
    - uniformLog: [] (empty initially)
    ↓
Student Reference Added to School Document
    - Added to school.students array
    ↓
Both collections updated atomically
```

#### Student-School Linking
```javascript
// Query students for specific school
const studentsQuery = query(
  collection(db, 'students'),
  where('schoolId', '==', schoolId)
);

// This ensures complete separation while maintaining relationship
```

### 3. Uniform Policy Management Flow

#### Creating Uniform Policies
```
User Opens Policy Modal (Level + Gender specific)
    ↓
System Filters Available Uniforms:
    - Matches school ID
    - Matches gender (Boys/Girls/Unisex)
    - Matches level (Senior/Junior)
    ↓
User Selects Uniforms and Configures:
    - isRequired: boolean
    - quantityPerStudent: number
    ↓
Policy Saved to School Document:
    - Added to school.uniformPolicy array
    - Each policy has unique ID
```

#### Policy Data Structure
```javascript
const policyData = {
  id: Date.now().toString(),           // Unique policy ID
  uniformId: uniform.id,               // Links to uniform
  uniformName: uniform.name,           // Cached for performance
  uniformType: uniform.type,           // Cached for performance
  level: "Senior",                     // Student level
  gender: "Boys",                      // Student gender
  isRequired: true,                    // Required vs optional
  quantityPerStudent: 2,               // How many per student
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

### 4. Uniform Logging Flow

#### When Student Receives Uniform
```
User Selects Student + Uniform
    ↓
System Checks Available Sizes:
    - Queries uniform variants
    - Filters by stock quantity > 0
    - Shows available sizes in dropdown
    ↓
User Logs Uniform Receipt:
    - Selects size (or marks as unavailable)
    - Enters quantity received
    ↓
Log Entry Created:
    - Added to student.uniformLog array
    - Inventory updated (stock reduced)
```

#### Log Entry Structure
```javascript
const logEntry = {
  id: Date.now().toString(),
  uniformId: uniform.uniformId,
  uniformName: uniform.uniformName,
  uniformType: uniform.uniformType,
  size: selectedSize || null,
  quantityReceived: parseInt(quantityReceived),
  sizeNotAvailable: sizeNotAvailable,
  sizeWanted: sizeWanted || null,
  loggedAt: new Date().toISOString(),
  loggedBy: user.uid
};
```

## 🔗 Key Relationships & Linking

### School ↔ Student Relationship
- **One-to-Many**: One school has many students
- **Linking Field**: `student.schoolId` → `school.id`
- **Dual Storage**: Students stored in both collections for performance
- **Query Pattern**: Filter students by schoolId for isolation

### School ↔ Uniform Policy Relationship
- **One-to-Many**: One school has many uniform policies
- **Storage**: Policies stored in `school.uniformPolicy` array
- **Filtering**: Policies filtered by level + gender for display

### Student ↔ Uniform Log Relationship
- **One-to-Many**: One student has many uniform log entries
- **Storage**: Logs stored in `student.uniformLog` array
- **Tracking**: Complete history of uniform receipts per student

### Uniform ↔ Inventory Relationship
- **Variants**: Uniforms have multiple variants (color, style)
- **Sizes**: Each variant has multiple sizes with quantities
- **Stock Management**: Quantities reduced when uniforms logged

## 🛠 Core Functions for Web Implementation

### School Management Functions
```javascript
// Create school
const createSchool = async (schoolData) => {
  const docRef = await addDoc(collection(db, 'schools'), {
    ...schoolData,
    students: [],
    uniformPolicy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

// Get school with fresh data
const getSchoolById = async (schoolId) => {
  const docRef = doc(db, 'schools', schoolId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// Count students per school
const getStudentCountForSchool = async (schoolId) => {
  const q = query(
    collection(db, 'students'),
    where('schoolId', '==', schoolId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
};
```

### Student Management Functions
```javascript
// Add student (dual collection update)
const addStudent = async (studentData) => {
  // Create in students collection
  const docRef = await addDoc(collection(db, 'students'), {
    ...studentData,
    uniformLog: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Add reference to school document
  await updateDoc(doc(db, 'schools', studentData.schoolId), {
    students: arrayUnion({
      id: docRef.id,
      name: studentData.name,
      level: studentData.level,
      gender: studentData.gender
    }),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

// Get students for specific school
const getStudentsForSchool = async (schoolId) => {
  const q = query(
    collection(db, 'students'),
    where('schoolId', '==', schoolId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Delete student (dual collection cleanup)
const deleteStudent = async (schoolId, studentId) => {
  // Delete from students collection
  await deleteDoc(doc(db, 'students', studentId));
  
  // Remove from school document
  const school = await getSchoolById(schoolId);
  const updatedStudents = school.students.filter(s => s.id !== studentId);
  
  await updateDoc(doc(db, 'schools', schoolId), {
    students: updatedStudents,
    updatedAt: serverTimestamp()
  });
};
```

### Uniform Policy Functions
```javascript
// Add uniform policy to school
const updateSchoolUniformPolicy = async (schoolId, policyData) => {
  const docRef = doc(db, 'schools', schoolId);
  const currentSchool = await getDoc(docRef);
  const currentPolicies = currentSchool.data()?.uniformPolicy || [];
  
  const newPolicy = {
    id: Date.now().toString(),
    uniformId: policyData.uniformId,
    uniformName: policyData.uniformName,
    uniformType: policyData.uniformType,
    level: policyData.level,
    gender: policyData.gender,
    isRequired: policyData.isRequired,
    quantityPerStudent: policyData.quantityPerStudent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await updateDoc(docRef, {
    uniformPolicy: [...currentPolicies, newPolicy],
    updatedAt: serverTimestamp()
  });
  
  return newPolicy;
};

// Get policies for school (with filtering)
const getSchoolUniformPolicies = async (schoolId, level = null, gender = null) => {
  const school = await getSchoolById(schoolId);
  if (!school?.uniformPolicy) return [];
  
  let policies = school.uniformPolicy;
  
  if (level) policies = policies.filter(p => p.level === level);
  if (gender) policies = policies.filter(p => p.gender === gender);
  
  return policies;
};

// Remove uniform policy
const removeSchoolUniformPolicy = async (schoolId, policyId) => {
  const docRef = doc(db, 'schools', schoolId);
  const currentSchool = await getDoc(docRef);
  const updatedPolicies = currentSchool.data()?.uniformPolicy?.filter(
    policy => policy.id !== policyId
  ) || [];
  
  await updateDoc(docRef, {
    uniformPolicy: updatedPolicies,
    updatedAt: serverTimestamp()
  });
};
```

### Uniform Logging Functions
```javascript
// Log uniform receipt for student
const updateStudentUniformLog = async (studentId, logEntry) => {
  const docRef = doc(db, 'students', studentId);
  
  await updateDoc(docRef, {
    uniformLog: arrayUnion(logEntry),
    updatedAt: serverTimestamp()
  });
};

// Get available sizes for uniform
const getAvailableSizes = async (uniformId) => {
  // Get uniform variants
  const variants = uniformVariants.filter(v => v.uniformId === uniformId);
  
  const availableSizes = new Set();
  variants.forEach(variant => {
    if (variant.sizes && Array.isArray(variant.sizes)) {
      variant.sizes.forEach(sizeObj => {
        const quantity = parseInt(sizeObj.quantity) || 0;
        if (quantity > 0 && sizeObj.size) {
          availableSizes.add(sizeObj.size);
        }
      });
    }
  });
  
  return Array.from(availableSizes).sort();
};
```

## 🎯 Web Implementation Guidelines

### 1. State Management
- Use React Context or Redux for global state
- Implement real-time listeners for live updates
- Cache frequently accessed data with proper invalidation

### 2. Component Architecture
```
SchoolManagement/
├── SchoolList.jsx              // List all schools
├── SchoolDetails.jsx           // School detail view
├── StudentManagement.jsx       // Student CRUD operations
├── UniformPolicyManager.jsx    // Policy creation/management
├── UniformLogging.jsx          // Log uniform receipts
└── DeficitReporting.jsx        // Track uniform deficits
```

### 3. API Layer Structure
```
api/
├── schools.js          // School CRUD operations
├── students.js         // Student management
├── uniformPolicies.js  // Policy management
├── uniformLogging.js   // Logging operations
└── inventory.js        // Inventory queries
```

### 4. Key Features to Implement
- **Real-time Updates**: Use Firestore listeners
- **Bulk Operations**: Batch student imports
- **Filtering & Search**: Advanced student/policy filtering
- **Reporting**: Deficit reports, compliance tracking
- **Validation**: Data integrity checks
- **Offline Support**: PWA capabilities

### 5. Performance Optimizations
- **Pagination**: For large student lists
- **Lazy Loading**: Load data on demand
- **Caching**: Cache policies and student data
- **Indexing**: Proper Firestore indexes for queries

## 🔒 Security Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Schools - authenticated users only
    match /schools/{schoolId} {
      allow read, write: if request.auth != null;
    }
    
    // Students - must belong to accessible school
    match /students/{studentId} {
      allow read, write: if request.auth != null 
        && resource.data.schoolId in getUserSchools();
    }
    
    // Uniforms - read for all authenticated, write for managers
    match /uniforms/{uniformId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && isManager();
    }
  }
}
```

## 📈 Scaling Considerations

### For 100 Schools + 120,000 Students:
1. **Indexing**: Create composite indexes for common queries
2. **Sharding**: Consider sharding large collections
3. **Caching**: Implement Redis for frequently accessed data
4. **Pagination**: Implement cursor-based pagination
5. **Background Jobs**: Use Cloud Functions for heavy operations
6. **Monitoring**: Implement proper logging and monitoring

This architecture ensures complete separation of concerns while maintaining proper relationships through the `schoolId` linking field. Each student belongs to exactly one school, and all operations are properly isolated by school context.
