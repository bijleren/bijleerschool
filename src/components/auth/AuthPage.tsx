import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ArrowLeft } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-yellow-50/40 flex items-center justify-center p-4 overflow-hidden">
      {/* Honeycomb hexagon pattern background */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%23F4B11B' stroke-width='1.5'/%3E%3Cpath d='M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='%23F4B11B' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '56px 100px',
        }}
      />
      <Link
        to="/"
        className="fixed top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Terug naar home</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">bijleer.school</h1>
          <p className="text-lg text-gray-600">Didactische toolkit voor leerkracht en leerling</p>
        </div>

        {/* Auth Forms */}
        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleMode={() => setIsLogin(true)} />
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2025 bijleer.school. Alle rechten voorbehouden.{' '}
            <a
              href="https://bijleren.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              bijleren.eu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}