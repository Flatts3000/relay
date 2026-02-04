import { Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Relay</h1>
        <p className="text-gray-600 mb-8">
          Coordination platform connecting mutual aid groups with fund hubs.
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">
            This application is under development.
          </p>
        </div>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600">The page you're looking for doesn't exist.</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
