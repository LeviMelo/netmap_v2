import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Library from './pages/Library'
import Editor from './pages/Editor'

// For GitHub Pages under /<REPO>/, BrowserRouter needs the same basename.
// If you prefer more resilience on GH Pages, switch to HashRouter.
const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { path: '/', element: <Library /> },
        { path: '/editor', element: <Editor /> },
      ],
    },
  ],
  {
    basename: '/concept-map', // change to '/<REPO>' or remove if root
  }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
