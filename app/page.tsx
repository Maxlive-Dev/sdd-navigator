// @req: SCD-TECH-001, SCD-UI-011, SCD-UI-012
export default function Home() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            SDD Navigator Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            A dashboard for navigating Specification-Driven Development artifacts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Requirement Cards */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">SCD-TECH-001</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Next.js 16+ with App Router.
          </p>
          <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
            ✅ Implemented
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">SCD-UI-011</h2>
          <p className="text-gray-700 dark:text-gray-300">
            WCAG AA accessibility with semantic HTML.
          </p>
          <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
            ✅ Implemented
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">SCD-UI-012</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Tailwind CSS for responsive design and theming.
          </p>
          <div className="mt-4 text-sm text-blue-600 dark:text-blue-400">
            ✅ Implemented
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Placeholder</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Additional dashboard widgets will be added here.
          </p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Coming soon
          </div>
        </div>
      </div>

      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
          <li>Run <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">npm run dev</code> to start the development server.</li>
          <li>Edit <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">app/page.tsx</code> to modify this dashboard.</li>
          <li>Check <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">.env.local</code> for environment variables.</li>
          <li>Toggle the theme using the button in the header.</li>
        </ul>
      </div>
    </div>
  );
}
