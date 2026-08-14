import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";

import Landing from "../pages/Landing";
import Signup from "../pages/Signup";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import Dashboard from "../pages/Dashboard";
import Courses from "../pages/Courses";
import CourseDetail from "../pages/CourseDetail";
import DocumentViewer from "../pages/DocumentViewer";
import DocumentChat from "../pages/DocumentChat";
import DocumentSummary from "../pages/DocumentSummary";
import DocumentNotes from "../pages/DocumentNotes";
import Chats from "../pages/Chats";
import ChatThread from "../pages/ChatThread";
import Quizzes from "../pages/Quizzes";
import QuizNew from "../pages/QuizNew";
import QuizTake from "../pages/QuizTake";
import QuizResults from "../pages/QuizResults";
import Flashcards from "../pages/Flashcards";
import FlashcardStudy from "../pages/FlashcardStudy";
import Explain from "../pages/Explain";
import Progress from "../pages/Progress";
import StudyPlanner from "../pages/StudyPlanner";
import StudyPlanView from "../pages/StudyPlanView";
import Settings from "../pages/Settings";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/signup", element: <Signup /> },
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password/:token", element: <ResetPassword /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/courses", element: <Courses /> },
          { path: "/courses/:courseId", element: <CourseDetail /> },
          { path: "/documents/:documentId", element: <DocumentViewer /> },
          { path: "/documents/:documentId/chat", element: <DocumentChat /> },
          { path: "/documents/:documentId/summary", element: <DocumentSummary /> },
          { path: "/documents/:documentId/notes", element: <DocumentNotes /> },
          { path: "/chats", element: <Chats /> },
          { path: "/chats/:chatId", element: <ChatThread /> },
          { path: "/quizzes", element: <Quizzes /> },
          { path: "/quizzes/new", element: <QuizNew /> },
          { path: "/quizzes/:quizId", element: <QuizTake /> },
          { path: "/quizzes/:quizId/results/:attemptId", element: <QuizResults /> },
          { path: "/flashcards", element: <Flashcards /> },
          { path: "/flashcards/:courseId/study", element: <FlashcardStudy /> },
          { path: "/explain", element: <Explain /> },
          { path: "/progress", element: <Progress /> },
          { path: "/study-planner", element: <StudyPlanner /> },
          { path: "/study-planner/:planId", element: <StudyPlanView /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
