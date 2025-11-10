# Monisha Inventory Management - Web Application

A comprehensive React-based web application for managing school uniform inventory, built with modern technologies and Firebase backend integration.

## 🏗️ System Architecture

### Technology Stack
- **Frontend:** React 18 with Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS + Shadcn/ui components
- **Backend:** Firebase (Firestore, Authentication)
- **Routing:** React Router v6
- **Charts:** Recharts
- **Animations:** Framer Motion

### Project Structure
```
web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (Button, Input, Modal, etc.)
│   │   ├── dashboard/      # Dashboard-specific components
│   │   ├── schools/        # School management components
│   │   ├── inventory/      # Inventory management components
│   │   └── reports/        # Reporting components
│   ├── pages/              # Route components
│   ├── stores/             # Zustand state management
│   ├── config/             # Configuration files
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── public/                 # Static assets
└── dist/                   # Build output
```

## 🔄 Data Flow Architecture

### Store Pattern
The application uses Zustand for state management with the following stores:

#### 1. School Store (`stores/schoolStore.js`)
```javascript
// Manages schools and students
- fetchSchools() → Firebase schools collection
- addSchool() → Creates new school document
- updateSchool() → Updates school data
- addUniformPolicy() → Manages school uniform requirements
- getTotalStudentCount() → Aggregates student data
```

#### 2. Inventory Store (`stores/inventoryStore.js`)
```javascript
// Manages products and batches
- fetchUniforms() → Firebase uniforms collection
- fetchUniformVariants() → Firebase uniform_variants collection
- fetchBatches() → Firebase batchInventory collection
- deductProductInventory() → Handles stock allocation
- reorderFromBatch() → Manages inventory replenishment
```

#### 3. Order Store (`stores/orderStore.js`)
```javascript
// Manages order processing
- fetchOrders() → Firebase orders collection
- createOrder() → Creates new order documents
- updateOrderStatus() → Manages order lifecycle
```

### Data Synchronization Pattern
```
UI Component → Zustand Store → Firebase SDK → Firestore
     ↓              ↓              ↓           ↓
User Action → State Update → API Call → Database Write
     ↓              ↓              ↓           ↓
Re-render ← State Sync ← Response ← Server Response
```

## 🎯 Key Features & Implementation

### 1. Dashboard Analytics
- **Real-time metrics:** Total inventory, active schools, revenue tracking
- **Interactive charts:** Revenue trends, size demand patterns, school performance
- **Recent activity:** Live updates of orders, batches, and school activities
- **Implementation:** Recharts with data aggregation from multiple Firebase collections

### 2. School Management
- **School creation:** Simplified modal with name-only input
- **Student management:** Comprehensive student profiles with uniform tracking
- **Uniform policies:** Configurable requirements per school level and gender
- **Deficit reporting:** Automated analysis of uniform shortfalls

### 3. Inventory Management
- **Batch-first approach:** Create batches → Generate products → Allocate to students
- **Multi-variant support:** Colors, sizes, and pricing per uniform type
- **Stock tracking:** Real-time inventory levels with reorder alerts
- **Audit trails:** Complete history of all inventory movements

### 4. Advanced Features
- **Cross-platform sync:** Real-time data sharing with mobile app
- **Role-based access:** Manager and staff permission levels
- **Responsive design:** Mobile-friendly interface
- **Dark mode support:** Theme switching capability

## 🔧 Technical Challenges & Solutions

### Challenge 1: Cross-Platform Data Consistency
**Problem:** Ensuring data created on web appears immediately on mobile and vice versa.

**Solution:**
- Server-first data fetching: `getDoc(docRef, { source: 'server' })`
- Optimistic UI updates with local state synchronization
- Consistent data structures across platforms
- Real-time listeners for critical collections

### Challenge 2: Complex Inventory Flow
**Problem:** Managing batch → product → student allocation with proper stock tracking.

**Solution:**
```javascript
// Implemented sophisticated inventory deduction system
1. Batch Creation → batchInventory collection
2. Product Creation → uniforms + uniform_variants (deducts from batch)
3. Student Allocation → students.uniformLog (deducts from product)
4. Reorder System → replenish products from batches
```

### Challenge 3: Uniform Policy Synchronization
**Problem:** Uniform policies created on one platform not appearing on the other.

**Solution:**
- Unified data structure with consistent field names
- Server-fetch enforcement for policy-related queries
- Standardized validation rules across platforms

### Challenge 4: Performance with Large Datasets
**Problem:** Slow loading with multiple schools and thousands of students.

**Solution:**
- Pagination for large lists
- Lazy loading of non-critical data
- Efficient Firebase queries with proper indexing
- Local caching with Zustand persistence

### Challenge 5: State Management Complexity
**Problem:** Managing complex nested data relationships.

**Solution:**
- Zustand stores with computed values
- Normalized data structures
- Efficient re-render patterns with selective subscriptions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project with Firestore enabled

### Installation
```bash
cd web
npm install
```

### Environment Setup
Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 📊 Data Flow Patterns

### 1. School → Student Relationship
```
School Creation → Student Addition → Uniform Allocation → Deficit Analysis
     ↓                 ↓                  ↓                 ↓
schools collection → students collection → uniformLog array → Reports
```

### 2. Inventory Flow
```
Batch → Product Variants → Student Allocation → Reorder
  ↓          ↓                  ↓              ↓
batchInventory → uniform_variants → allocation → reorderHistory
```

### 3. Order Processing
```
School Selection → Item Selection → Order Creation → Status Updates
      ↓               ↓               ↓              ↓
schools data → uniform_variants → orders collection → status tracking
```

## 🔐 Security Implementation

### Authentication
- Firebase Authentication with email/password
- Role-based access control (manager/staff)
- Protected routes with authentication guards

### Data Security
- Firestore security rules for collection access
- Input validation and sanitization
- Audit trails for all critical operations

## 📈 Performance Optimizations

### Frontend Optimizations
- React.memo for expensive components
- useMemo for computed values
- Lazy loading of route components
- Efficient re-render patterns

### Backend Optimizations
- Composite indexes for complex queries
- Batch operations for multiple writes
- Pagination for large datasets
- Caching strategies with Zustand

## 🧪 Testing Strategy

### Unit Testing
- Component testing with React Testing Library
- Store testing with Zustand test utilities
- Utility function testing

### Integration Testing
- Firebase integration tests
- Cross-store communication tests
- API endpoint testing

## 🚀 Deployment

### Build Process
```bash
npm run build
```

### Deployment Options
- Netlify (recommended)
- Vercel
- Firebase Hosting
- Traditional web servers

## 🔮 Future Enhancements

### Planned Features
- Real-time notifications
- Advanced reporting dashboard
- Bulk operations interface
- Export/import functionality
- Multi-language support

### Technical Improvements
- Service worker for offline support
- Progressive Web App features
- Advanced caching strategies
- Performance monitoring

## 📋 Page-by-Page Purpose Guide

### What Each Page Does and Why You Need It

#### 🏠 Dashboard (`/dashboard`)
**What It Does:** Your command center - shows you the big picture of your business at a glance.

**Why You Need It:**
- See total inventory value and how much stock you have
- Track which schools are your best customers
- Monitor recent activity (new orders, low stock alerts)
- Spot trends with visual charts (which uniforms sell most, seasonal patterns)
- Get early warnings about problems (running out of popular sizes)

**Who Uses It:** Managers for daily business oversight, staff for quick status checks

**Real-World Example:** "I can see we've sold 200 shirts this month, Pamushana High School is our biggest customer, and we're running low on Size 34 blue shirts."

---

#### 🏫 Schools Management (`/schools`)
**What It Does:** Manages all your school customers and their specific uniform requirements.

**Why You Need It:**
- Add new schools quickly (just enter the school name)
- Set uniform policies for each school ("Junior boys need 2 blue shirts each")
- View all students enrolled at each school
- Track which students still need uniforms (deficit reports)
- See each school's order history and payment status

**Who Uses It:** Both managers and staff for customer relationship management

**Real-World Example:** "Pamushana High School requires all Form 1 boys to have 2 blue shirts and 1 pair of grey trousers. I can see that 15 students still need their second shirt."

---

#### 📦 Inventory Management (`/inventory`)
**What It Does:** Controls all your uniform products, sizes, colors, and stock levels.

**Why You Need It:**
- Add new uniform types (shirts, trousers, ties, etc.)
- Manage different colors and sizes for each uniform
- Set prices for different variants
- Track current stock levels in real-time
- See which items are running low and need reordering
- View complete history of where each item went

**Who Uses It:** Primarily managers for product management, staff for stock checking

**Real-World Example:** "We have 45 blue shirts in Size 32, 23 in Size 34, and only 3 in Size 36 - I need to reorder Size 36 urgently."

---

#### 📊 Reports (`/reports`)
**What It Does:** Turns your data into visual insights to help make business decisions.

**Why You Need It:**
- See which uniform types are most popular
- Compare sales between different schools
- Identify seasonal trends (more shirts needed at term start)
- Plan future purchases based on demand patterns
- Generate reports for stakeholders or suppliers

**Who Uses It:** Managers for strategic planning and business analysis

**Real-World Example:** "The chart shows blue shirts are 60% of our sales, and demand peaks in January and May - I should order more blue shirts before those months."

---

#### 📋 Batch Inventory (`/batches`)
**What It Does:** Manages bulk purchases from suppliers before they become individual sellable items.

**Why You Need It:**
- Record large deliveries from suppliers ("500 shirts arrived today")
- Track what you paid and when you received items
- Convert bulk purchases into individual sellable products
- Trace any quality issues back to specific supplier batches
- Manage supplier relationships and purchase history

**Who Uses It:** Managers for supplier management and cost tracking

**Real-World Example:** "Batch #2024-001 contained 500 blue shirts that cost $2,500. I've converted 300 into sellable inventory and kept 200 in reserve."

---

#### 👤 Profile Management (`/profile`)
**What It Does:** Manages user accounts and access permissions.

**Why You Need It:**
- Update your personal information (name, phone, email)
- Change your password for security
- View your role and permissions
- See your activity history
- Manage profile picture and contact details

**Who Uses It:** All users for account management

**Real-World Example:** "I need to update my phone number so schools can reach me, and I want to change my password for better security."

---

### How These Pages Work Together

**The Complete Workflow:**
1. **Batches:** Record bulk purchases from suppliers
2. **Inventory:** Convert batches into sellable products with sizes and colors
3. **Schools:** Set up schools and their uniform requirements
4. **Dashboard:** Monitor overall business performance
5. **Reports:** Analyze trends to make better purchasing decisions
6. **Profile:** Manage who can access what information

**Real-World Business Flow:**
"I receive 1000 shirts from my supplier (Batches) → I convert them into different sizes and colors (Inventory) → Schools place orders for their students → I track sales and identify trends (Dashboard & Reports) → I use trends to plan my next supplier order (back to Batches)"

## 📚 Related Documentation

- [Firebase Data Architecture](../FIREBASE_DATA_ARCHITECTURE.md)
- [Mobile App README](../mobile/README.md)
- [Inventory Flow Design](../INVENTORY_FLOW_DESIGN.md)

## 🤝 Contributing

1. Follow the established code patterns
2. Maintain consistency with mobile app data structures
3. Add proper error handling and loading states
4. Update documentation for new features
5. Test cross-platform compatibility

## 📞 Support

For technical issues or questions about the web application architecture, refer to the comprehensive documentation or contact the development team.
- **School & Student Management:** A dedicated module for managing schools and their uniform requirements, with the ability to associate students with specific schools.
- **Dynamic Reporting:** A powerful reporting tool with dynamic charts that visualize inventory distribution by uniform type and variants, filterable by school.
- **Responsive Design:** A fully responsive and mobile-first design ensures a seamless experience across all devices.

## Tech Stack

### Frontend

- **React:** A JavaScript library for building user interfaces, chosen for its component-based architecture and efficient state management.
- **Vite:** A fast build tool that provides a quicker and leaner development experience for modern web projects.
- **React Router:** For declarative routing in the React application, enabling a multi-page experience.
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development and a consistent design system.
- **Framer Motion:** For creating fluid and engaging animations that improve the user experience.
- **Lucide React:** A library of beautiful and consistent icons that enhance the UI's visual appeal.
- **Recharts:** A composable charting library built on React components for creating dynamic and interactive charts.
- **Zustand:** A small, fast, and scalable state-management solution.
- **Lottie React:** For rendering high-quality, lightweight animations, such as the success animation when adding a new product.

### Backend & Services

- **Firebase:** A comprehensive backend-as-a-service (BaaS) platform that provides a suite of tools to build, release, and monitor web applications.
  - **Authentication:** Simplifies the implementation of secure user authentication and role-based access.
  - **Firestore:** A flexible, scalable NoSQL database with real-time capabilities, perfect for an inventory application where live data updates are crucial.
  - **Storage:** Provides a simple and secure way to store and manage user-generated content like product images.

## Project Structure

The project follows a standard React application structure, with a clear separation of concerns:

- **`src/components`**: Contains reusable UI components used throughout the application (e.g., `Button`, `Modal`, `SchoolSelect`).
- **`src/pages`**: Each file in this directory represents a route in the application (e.g., `Dashboard`, `Inventory`, `Reports`).
- **`src/stores`**: Holds the Zustand store definitions for managing global state (e.g., `authStore`, `inventoryStore`, `schoolStore`).
- **`src/config`**:
  - **`firebase.js`**: Initializes and configures the Firebase app.
- **`public`**: Contains static assets like images and icons.

## Component & Page Architecture

The application's architecture is designed to be modular and scalable, with a clear separation between pages and reusable components.

- **Pages (`src/pages`)**: Each file in this directory corresponds to a specific route. Pages are responsible for fetching the data they need from the Zustand stores and composing the UI by assembling various components. For example, the `NewSchools.jsx` page fetches all schools from the `schoolStore` and renders them in a grid or list.

- **Components (`src/components`)**: These are the building blocks of the UI. They are designed to be reusable and are often composed together to create more complex UI structures. Data and callbacks are passed as props from their parent pages.

- **State Management (`src/stores`)**: Global state is managed with Zustand, which provides a simple and efficient way to share state across the application. Each store is responsible for a specific domain (e.g., `authStore` for user authentication, `inventoryStore` for products).

## Page & Component Breakdown

Here is a breakdown of the key pages and the main components they utilize:

- **`Dashboard.jsx` (`/dashboard`):**
  - **Purpose:** Serves as the main landing page, offering a high-level overview of the inventory status, recent orders, and key performance metrics.
  - **Components:**
    - `DashboardHeader`: Displays the main title and a welcome message.
    - `InventoryStatus`: Shows key inventory metrics, such as total items, categories, and low-stock products.
    - `RecentOrders`: A list of the most recent orders with their current status.
    - `DynamicCharts`: Renders various charts to visualize sales trends and inventory data.
    - `SchoolPerformance`: A dedicated chart that displays sales or inventory data broken down by school.

- **`NewSchools.jsx` & `NewSchoolDetails.jsx` (`/schools`):**
  - **Purpose:** Manages all school-related information. The main page lists all schools with search and filter capabilities, while the details page provides an in-depth view of a specific school's students and uniform requirements.
  - **Components:**
    - `SchoolModal`: A dialog used for adding new schools and editing the details of existing ones.
    - `SchoolTabUI`: Provides tabbed navigation on the school details page to switch between student lists and uniform requirements.
    - `ModernStudentList`: Displays a list of all students associated with a specific school.
    - `ModernUniformRequirements`: Shows the specific uniform requirements for a selected school.

- **`Inventory.jsx` & `AddProductNew.jsx` (`/inventory`):**
  - **Purpose:** The core of the inventory management system. The main page displays all uniform products with robust filtering and search options. The "Add Product" page provides a detailed form for creating new uniforms with multiple variants, sizes, and pricing.
  - **Components:**
    - `AdvancedFilterSystem`: A component that allows users to apply complex filters to the product list.
    - `SchoolSelect`: A reusable dropdown component for filtering products by school.
    - `Input` and `Select`: Custom-styled form elements used throughout the creation and editing process to ensure a consistent UI.

- **`Reports.jsx` (`/reports`):**
  - **Purpose:** Provides visual analytics on inventory data. It features dynamic bar charts to show inventory levels by uniform type and variants, with the ability to filter data by school.
  - **Components:**
    - `SchoolSelect`: A dropdown used to filter the report data for a specific school.
    - `BarChart` (from Recharts): The charting component used to visualize inventory data in a clear, readable format.
    - `LoadingScreen`: A user-friendly loading indicator displayed while data is being fetched.

- **`BatchInventory.jsx` & `CreateBatch.jsx` (`/batches`):**
  - **Purpose:** Manages the inventory batches. Users can create new batches of products, track their status, and view detailed information for each batch.
  - **Components:**
    - `BatchModal`: A dialog used for creating and editing inventory batches.
    - `Input` and `Select`: Custom-styled form elements for the batch creation form.

- **`ProfilePage.jsx` (`/profile`):**
  - **Purpose:** Allows users to view and update their personal profile information, including their name, phone number, and profile picture.
  - **Components:**
    - `Input`: Custom-styled input fields for the profile form.
    - `LoadingButton`: A button that displays a loading state during form submission to provide user feedback.

### Example Flow: Displaying Inventory Reports

1. The **`Reports.jsx`** page is rendered when the user navigates to the `/reports` route.
2. The page uses a `SchoolSelect` component to allow the user to filter the reports by school.
3. The `useEffect` hook in **`Reports.jsx`** fetches all uniform data from the `uniforms` collection in Firestore.
4. The data is then processed to calculate the total quantity of each uniform type and variant. If a school is selected, the data is filtered before processing.
5. The processed data is passed to the **`BarChart`** and **`ResponsiveContainer`** components from the Recharts library.
6. The charts are rendered with custom styling, animations, and tooltips to provide a clear and interactive visualization of the inventory data.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/monishainventory-v3.git
   cd monishainventory-v3
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Firebase:**
   - Create a new project on the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** (Email/Password provider), **Firestore**, and **Storage**.
   - In your Firebase project settings, add a new web app and copy the `firebaseConfig` object.
   - Replace the placeholder configuration in `src/config/firebase.js` with your own project's configuration.

4. **Run the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

### Available Scripts

- **`npm run dev`**: Starts the Vite development server.
- **`npm run build`**: Builds the application for production.
- **`npm run preview`**: Serves the production build locally for previewing.

## Deploying to Netlify

To ensure proper routing with React Router on Netlify, a `_redirects` file has been added to the `public` directory. This file contains the following configuration:

```
/* /index.html 200
```

This single line instructs Netlify to:
- Match all routes (`/*`)
- Serve the `/index.html` file
- Return a 200 status code (success) instead of 404

### Deployment Steps:

1. Build your project with `npm run build`
2. Deploy to Netlify, ensuring your publish directory is set to `dist`
3. After deployment, test a direct URL to a nested route (e.g., `/dashboard`)
4. Verify that page refreshes on nested routes work correctly

If you encounter 404 errors on routes or refreshes, check that the `_redirects` file was properly included in your build output.

## Future Enhancements

- **Order Management:** A complete system for creating, tracking, and fulfilling orders.
- **Supplier Management:** A module for managing suppliers and purchase orders.
- **Advanced Filtering & Sorting:** More advanced filtering and sorting options on all data tables.
- **Automated Testing:** Implementation of unit and end-to-end tests to ensure application stability.
- **User Roles & Permissions:** More granular control over user permissions and access levels.
