# Amazon Orders Manager - Frontend Application

A modern Vue.js 3 frontend application for managing Amazon orders with TypeScript, Pinia state management, and Tailwind CSS.

## 🚀 Features

- **Authentication**: User registration and login with JWT tokens
- **Amazon Orders Management**: View, filter, and manage Amazon orders
- **Direct Orders**: Create and manage direct orders with full CRUD operations
- **Issues & Returns Tracking**: Monitor and manage order issues and returns
- **Real-time Data**: Automatic synchronization with backend API
- **Export Functionality**: Export direct orders to CSV
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 📋 Prerequisites

- Node.js (v20.19.0 or >=22.12.0)
- npm or yarn
- Backend server running on http://localhost:8080 (or configured URL)

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Edit `.env` file to set your backend API URL:
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
The application will start on http://localhost:5173

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── api/              # API service layer
│   ├── client.ts     # Axios client with interceptors
│   ├── auth.ts       # Authentication APIs
│   ├── orders.ts     # Orders APIs
│   └── directOrders.ts # Direct orders APIs
├── stores/           # Pinia state management
│   ├── auth.ts       # Authentication store
│   ├── orders.ts     # Orders store
│   └── directOrders.ts # Direct orders store
├── types/            # TypeScript type definitions
│   └── index.ts      # All application types
├── views/            # Page components
│   ├── LoginView.vue
│   ├── RegisterView.vue
│   ├── HomeView.vue
│   ├── OrdersView.vue
│   ├── DirectOrdersView.vue
│   ├── IssuesView.vue
│   └── ReturnsView.vue
├── router/           # Vue Router configuration
│   └── index.ts
├── App.vue           # Main app component
└── main.ts           # Application entry point
```

## 🔐 Authentication

The application uses JWT token-based authentication:

1. **Register** a new account at `/register`
2. **Login** with your credentials at `/login`
3. All API requests automatically include the JWT token
4. Token is stored in localStorage
5. Automatic redirect to login if token expires

## 🎯 Available Pages

### Dashboard (`/`)
- Overview statistics (total orders, issues, returns)
- Quick actions (import orders, create direct order)

### Orders (`/orders`)
- List all Amazon orders with pagination
- Filter by Order ID, Buyer Name, SKU
- Import orders from BaseLinker
- View order details

### Direct Orders (`/direct-orders`)
- List all direct orders
- Create new direct orders
- Edit existing orders
- Delete orders
- Export to CSV

### Issues (`/issues`)
- View all orders with safety claims or issues
- Track issue status and reasons

### Returns (`/returns`)
- View all return orders
- Track replacement orders

## 🔌 API Endpoints Used

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Orders
- `GET /api/v1/orders` - List orders with filters
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/import` - Import from BaseLinker
- `PATCH /api/v1/orders/:id/manual` - Update manual fields
- `GET /api/v1/issues` - List issues
- `GET /api/v1/returns` - List returns

### Direct Orders
- `GET /api/v1/direct-orders` - List direct orders
- `POST /api/v1/direct-orders` - Create direct order
- `GET /api/v1/direct-orders/:id` - Get direct order
- `PATCH /api/v1/direct-orders/:id` - Update direct order
- `DELETE /api/v1/direct-orders/:id` - Delete direct order
- `GET /api/v1/direct-orders/export` - Export to CSV

## 🎨 Styling

The application uses Tailwind CSS utility classes for styling:
- Responsive grid layouts
- Modern card-based design
- Color-coded status badges
- Hover effects and transitions
- Form validation states

## 🔧 Configuration

### Backend URL
Update `VITE_API_BASE_URL` in `.env` file:
```env
VITE_API_BASE_URL=http://your-backend-url:port
```

### Pagination
Default pagination: 20 items per page
Can be modified in component filters

## 📦 Technologies Used

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS (via @apply directives)

## 🚧 Future Enhancements

- [ ] Advanced filtering and search
- [ ] Bulk operations
- [ ] Real-time notifications
- [ ] Dark mode support
- [ ] Advanced order analytics
- [ ] Print/PDF export functionality
- [ ] Multi-language support

## 📝 Development Notes

- All API calls use async/await with proper error handling
- Components use Vue 3 Composition API with `<script setup>`
- Type-safe with comprehensive TypeScript interfaces
- Authenticated routes protected by navigation guards
- Automatic token refresh mechanism

## 🐛 Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your backend server has CORS middleware configured:
```go
// Backend should allow origin: http://localhost:5173
```

### Authentication Errors
- Clear localStorage if you face token issues
- Check backend JWT secret matches
- Ensure backend server is running

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

ISC

## 👥 Support

For issues or questions, please contact the development team.
