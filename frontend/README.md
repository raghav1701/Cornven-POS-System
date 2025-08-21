# Cornven POS - Tenant Management System

A modern Point-of-Sale and Self-Service Management System for Cornven, a concept cube store in Australia that collaborates with over 200 independent artists and designers.

## Features

### Module 1: Tenant & Rental Management (Admin Only)

- **Tenant List**: View all tenants with their details, cube assignments, and lease status
- **Add/Edit Tenant**: Modal form for creating and updating tenant information
- **Lease Management**: Set and update lease start/end dates with automatic status calculation
- **Rent Collection**: Record and track rent payments with payment history

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React useState (Zustand ready for future implementation)
- **Data**: Mock JSON data for development

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
pos/
├── app/
│   ├── admin/
│   │   └── tenants/
│   │       └── page.tsx          # Main tenant management page
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/
│   ├── Navigation.tsx           # Top navigation bar
│   ├── TenantList.tsx          # Tenant table with CRUD actions
│   ├── TenantForm.tsx          # Add/Edit tenant modal form
│   ├── LeaseManagement.tsx     # Lease date management
│   └── RentCollection.tsx      # Payment recording and history
├── types/
│   └── tenant.ts               # TypeScript interfaces
├── data/
│   └── mockData.ts             # Mock data and utilities
└── package.json
```

## Key Features

### Tenant Management
- Add, edit, and delete tenants
- Assign cube spaces (C1-C5)
- Track contact information and business details
- Form validation and error handling

### Lease Management
- Set lease start and end dates
- Automatic status calculation (Upcoming/Active/Expired)
- Visual status indicators
- Real-time status updates

### Rent Collection
- Record payments with amount, method, and date
- Payment history tracking
- Total payment calculations
- Multiple payment methods (Bank Transfer/Card)

### Dashboard Features
- Statistics overview cards
- Tab-based navigation
- Responsive design
- Clean admin interface

## Mock Data

The application includes sample data:
- **Alice Smith**: Active lease with payment history
- **Bob Lee**: Upcoming lease with no payments
- **Carol Johnson**: Expired lease with historical payments

## Future Modules

- **Inventory Management** (Admin + Store Staff)
- **POS Checkout** (Store Staff)
- **Artist Self-Service Portal** (Artists)

## Design System

The application uses a consistent design system with:
- Primary blue color scheme
- Status-based color coding (green/blue/red)
- Responsive grid layouts
- Accessible form controls
- Hover states and transitions

## Development Notes

- Uses TypeScript for type safety
- Modular component architecture
- Tailwind CSS for consistent styling
- Mock data for rapid prototyping
- Ready for backend integration
- Prepared for role-based access control