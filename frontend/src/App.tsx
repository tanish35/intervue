import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { PollProvider } from "./contexts/PollContext";

import RoleSelection from "./pages/RoleSelection";
import TeacherUsername from "./pages/teacher/Username";
import CreatePollRoom from "./pages/teacher/CreatePollRoom";
import TeacherDashboard from "./pages/teacher/Dashboard";
import PollHistory from "./pages/teacher/PollHistory";
import StudentUsername from "./pages/student/Username";
import JoinPoll from "./pages/student/JoinPoll";
import WaitingRoom from "./pages/student/WaitingRoom";
import AnswerPoll from "./pages/student/AnswerPoll";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <PollProvider>
        <Router>
          <Routes>
            {}
            <Route path="/" element={<RoleSelection />} />

            {}
            <Route path="/teacher/username" element={<TeacherUsername />} />
            <Route path="/teacher/create-room" element={<CreatePollRoom />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/history" element={<PollHistory />} />

            {}
            <Route path="/student/username" element={<StudentUsername />} />
            <Route path="/student/join" element={<JoinPoll />} />
            <Route path="/student/waiting" element={<WaitingRoom />} />
            <Route path="/student/answer" element={<AnswerPoll />} />
          </Routes>
        </Router>
        <Toaster />
      </PollProvider>
    </ThemeProvider>
  );
}

export default App;
