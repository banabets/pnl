# Complete User Authentication & Management System

## Overview
A comprehensive user authentication and management system has been implemented with full backend and frontend support.

## Backend Implementation

### Files Created/Modified

#### `server/user-auth.ts`
Complete user authentication manager with:
- **User Registration**: Username, email, password validation
- **User Login**: JWT token generation
- **Password Management**: PBKDF2 hashing with salt
- **Session Management**: Active session tracking
- **Activity Logging**: Complete audit trail
- **User Roles**: `user`, `admin`, `premium`
- **User Status**: `active`, `suspended`, `banned`
- **Profile Management**: Display name, bio, avatar, timezone, language
- **Settings Management**: Theme, notifications, trading preferences
- **Statistics Tracking**: Total trades, volume, profit, win rate

#### `server/auth-middleware.ts`
Authentication middleware for Express:
- `authenticateToken`: Required authentication
- `optionalAuth`: Optional authentication
- `requireRole`: Role-based access control

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user (rate limited)
- `POST /api/auth/login` - Login user (rate limited)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

#### User Management
- `GET /api/auth/user/:userId` - Get user by ID
- `PUT /api/auth/user/:userId/profile` - Update profile
- `PUT /api/auth/user/:userId/settings` - Update settings
- `POST /api/auth/user/:userId/change-password` - Change password
- `GET /api/auth/user/:userId/sessions` - Get user sessions
- `GET /api/auth/user/:userId/activity` - Get activity logs
- `GET /api/auth/user/:userId/stats` - Get user statistics

#### Password Recovery
- `POST /api/auth/forgot-password` - Request password reset

### Security Features

1. **Password Hashing**: PBKDF2 with 10,000 iterations and random salt
2. **JWT Tokens**: Secure token-based authentication with expiration
3. **Rate Limiting**: 5 requests per 15 minutes for auth endpoints
4. **Session Management**: Track active sessions with IP and user agent
5. **Activity Logging**: Complete audit trail of user actions

### Data Storage

All user data is stored in JSON files:
- `data/users.json` - User accounts
- `data/sessions.json` - Active sessions
- `data/user-activity.json` - Activity logs

## Frontend Implementation

### Files Modified

#### `web/src/components/UserProfile.tsx`
Complete user profile component with:
- **Registration/Login Forms**: Full validation
- **Profile Tab**: Edit username, display name, bio, timezone, language
- **Settings Tab**: Theme, notifications, trading preferences
- **Security Tab**: Change password
- **Activity Tab**: View activity logs

#### `web/src/utils/api.ts`
Enhanced API client with:
- **JWT Token Interceptor**: Automatically adds token to requests
- **401 Handler**: Auto-logout on token expiration
- **Error Handling**: Proper error messages

### User Interface

The UserProfile component includes:
1. **User Info Card**: Avatar, username, email, statistics
2. **Tab Navigation**: Profile, Settings, Security, Activity
3. **Form Validation**: Client-side validation
4. **Loading States**: Visual feedback during operations
5. **Error Handling**: User-friendly error messages

## User Data Structure

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // salt:hash format
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'premium';
  status: 'active' | 'suspended' | 'banned';
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  };
  settings?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: {
      email?: boolean;
      priceAlerts?: boolean;
      tradeAlerts?: boolean;
    };
    trading?: {
      defaultSlippage?: number;
      defaultWalletIndex?: number;
    };
  };
  stats?: {
    totalTrades?: number;
    totalVolume?: number;
    totalProfit?: number;
    winRate?: number;
  };
}
```

## Usage

### Registering a User
```typescript
const response = await api.post('/auth/register', {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securepassword123'
});
// Returns: { success: true, user: User, token: string }
```

### Logging In
```typescript
const response = await api.post('/auth/login', {
  usernameOrEmail: 'johndoe',
  password: 'securepassword123'
});
// Returns: { success: true, user: User, token: string }
// Token is automatically stored in localStorage
```

### Making Authenticated Requests
```typescript
// Token is automatically added by interceptor
const response = await api.get('/auth/me');
// Returns: { success: true, user: User }
```

### Updating Profile
```typescript
const response = await api.put(`/auth/user/${userId}/profile`, {
  displayName: 'John Doe',
  bio: 'Crypto trader',
  timezone: 'America/New_York',
  language: 'en'
});
```

### Changing Password
```typescript
const response = await api.post(`/auth/user/${userId}/change-password`, {
  currentPassword: 'oldpassword',
  newPassword: 'newpassword123'
});
```

## Next Steps

### Integration with Portfolio
- Modify `PortfolioTracker` to accept `userId` parameter
- Store positions and trades per user
- Update API routes to require authentication
- Associate trades with user accounts

### Integration with Wallets
- Associate wallets with user accounts
- Store wallet keypairs per user (encrypted)
- Implement wallet sharing between users
- Add wallet permissions system

### Email Verification
- Add email verification flow
- Send verification emails
- Track verification status
- Require verification for certain actions

### Two-Factor Authentication (2FA)
- Add 2FA support (TOTP)
- QR code generation for setup
- Backup codes
- Require 2FA for sensitive operations

## Environment Variables

Add to `.env`:
```bash
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=7d
```

## Security Considerations

1. **Change JWT_SECRET**: Use a strong random secret in production
2. **HTTPS Only**: Always use HTTPS in production
3. **Password Requirements**: Enforce strong passwords (8+ chars, mixed case, numbers)
4. **Rate Limiting**: Already implemented for auth endpoints
5. **Session Expiration**: Tokens expire after 7 days (configurable)
6. **Activity Logging**: Monitor for suspicious activity

## Testing

Test the system:
1. Register a new user
2. Login with credentials
3. Update profile information
4. Change settings
5. Change password
6. View activity logs
7. Logout

## Notes

- All passwords are hashed using PBKDF2 (not bcrypt due to build issues)
- Sessions are stored in memory and persisted to disk
- Activity logs are limited to last 10,000 entries
- User data is stored in JSON files (consider database for production)

