import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

type PollOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type Question = {
  id: string;
  text: string;
  options: PollOption[];
  timer: number;
  status: "PENDING" | "ACTIVE" | "CLOSED";
  results?: {
    optionId: string;
    percentage: number;
    _count: number;
  }[];
};

type Participant = {
  id: string;
  username: string;
};

type PollRoom = {
  id: string;
  code: string;
  title: string;
  activeQuestion: Question | null;
  status: "ACTIVE" | "CLOSED";
  questions: Question[];
  participants: Participant[];
  history: Question[];
};

type PollHistoryItem = {
  id: string;
  text: string;
  timer: number;
  status: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    _count: number;
    percentage: number;
  }>;
  userAnswerId?: string | null;
};

type PollHistory = {
  pollId: string;
  code: string;
  title: string;
  history: PollHistoryItem[];
};

type PollContextType = {
  username: string;
  setUsername: (name: string) => void;
  role: "teacher" | "student" | null;
  pollRoom: PollRoom | null;
  createPollRoom: () => Promise<boolean>;
  joinPollRoom: (code: string) => Promise<boolean>;
  setRole: (role: "teacher" | "student" | null) => void;
  handleSetUsername: (name: string) => Promise<boolean>;
  createQuestion: (
    text: string,
    options: string[],
    timer: number
  ) => Promise<void>;
  activateQuestion: (questionId: string) => Promise<void>;
  submitAnswer: (questionId: string, optionId: string) => Promise<void>;
  getPollHistory: (code: string) => Promise<PollHistory | null>;
  socket: Socket | null;
};

const PollContext = createContext<PollContextType | undefined>(undefined);

export function PollProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState("");
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [pollRoom, setPollRoom] = useState<PollRoom | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Check both localStorage AND sessionStorage
    const token =
      localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (token) {
      setAuthToken(token);
      initializeSocket(token);
      loadPersistedPollState(token); // New function (see step 2)
    }
  }, []);

  // Save poll state to localStorage
  const persistPollState = (code: string) => {
    localStorage.setItem("currentPoll", code);
  };

  // Load persisted poll state
  const loadPersistedPollState = async (token: string) => {
    const savedPollCode = localStorage.getItem("currentPoll");

    if (savedPollCode) {
      try {
        const response = await axios.get(`/api/poll/${savedPollCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPollRoom(response.data);
        socket?.emit("join-poll", savedPollCode);
      } catch (error) {
        console.error("Error loading saved poll:", error);
        localStorage.removeItem("currentPoll");
      }
    }
  };

  const initializeSocket = (token: string) => {
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("question-activated", (data: { question: Question }) => {
      setPollRoom((prev) => {
        if (!prev) return null;

        // Ensure we're using the correct types
        const updatedQuestions = prev.questions.map((q) =>
          q.id === data.question.id ? { ...q, status: "ACTIVE" as const } : q
        );

        return {
          ...prev,
          activeQuestion: {
            ...data.question,
            status: "ACTIVE" as const,
          },
          questions: updatedQuestions,
        };
      });
    });

    newSocket.on(
      "question-results",
      (data: {
        questionId: string;
        results: Array<{
          optionId: string;
          percentage: number;
          _count: number;
        }>;
        correctOption: string | null;
      }) => {
        setPollRoom((prev) => {
          if (!prev) return null;

          // Find the question to update
          const updatedQuestion = prev.questions.find(
            (q) => q.id === data.questionId
          );
          if (!updatedQuestion) return prev;

          // Create updated question with results and ensure proper types
          const questionWithResults: Question = {
            ...updatedQuestion,
            status: "CLOSED" as const,
            results: data.results,
            options: updatedQuestion.options.map((opt) => ({
              ...opt,
              isCorrect: opt.id === data.correctOption,
            })),
          };

          // Update both questions and history
          const updatedQuestions = prev.questions.map((q) =>
            q.id === data.questionId ? questionWithResults : q
          );

          // Ensure history array exists
          const prevHistory = prev.history || [];

          // Check if question is already in history
          const isAlreadyInHistory = prevHistory.some(
            (h) => h.id === data.questionId
          );

          // Update or add to history
          const updatedHistory = isAlreadyInHistory
            ? prevHistory.map((h) =>
                h.id === data.questionId ? questionWithResults : h
              )
            : [...prevHistory, questionWithResults];

          // Return a properly typed PollRoom object
          return {
            ...prev,
            questions: updatedQuestions,
            history: updatedHistory,
            activeQuestion: null, // Clear active question when results come in
          };
        });
      }
    );

    // Add handler for new participants
    newSocket.on(
      "new-participant",
      (data: { user: { id: string; username: string }; poll: any }) => {
        setPollRoom((prev) => {
          if (!prev) return null;

          // Ensure we don't add duplicate participants
          const existingParticipantIds = prev.participants.map((p) => p.id);
          const updatedParticipants = existingParticipantIds.includes(
            data.user.id
          )
            ? prev.participants
            : [
                ...prev.participants,
                { id: data.user.id, username: data.user.username },
              ];

          // Return properly typed PollRoom
          return {
            ...prev,
            participants: updatedParticipants,
          };
        });
      }
    );

    // Add handler for poll updates
    newSocket.on("poll-update", (data: { poll: Partial<PollRoom> }) => {
      setPollRoom((prev) => {
        if (!prev) return null;

        // Ensure we're returning a proper PollRoom type
        return {
          ...prev,
          ...(data.poll as any), // Use type assertion here since we can't guarantee data.poll structure
          // Preserve local state that might not be in the server update
          activeQuestion: prev.activeQuestion,
          history: prev.history || [],
        };
      });
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  };

  const createPollRoom = async (): Promise<boolean> => {
    try {
      let token = authToken;

      if (!token) {
        const storedToken = sessionStorage.getItem("authToken");
        if (!storedToken) {
          console.error("No auth token found!");
          return false;
        }
        setAuthToken(storedToken);
        token = storedToken;
      }
      const response = await axios.post(
        "/api/poll",
        { title: "New Poll" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Poll created:", response.data);
      setPollRoom(response.data);
      persistPollState(response.data.code);
      setRole("teacher");
      console.log("Poll room", pollRoom);
      socket?.emit("join-poll", response.data.code);
      return true; // Success
    } catch (error) {
      console.error("Error creating poll:", error);
      return false; // Failure
    }
  };

  // Join existing poll room
  const joinPollRoom = async (code: string): Promise<boolean> => {
    try {
      const response = await axios.post(
        "/api/poll/join",
        { code, username },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setPollRoom(response.data.poll);
      setRole("student");
      persistPollState(code);
      socket?.emit("join-poll", code);
      return true; // Return true on success
    } catch (error) {
      console.error("Error joining poll:", error);
      return false; // Return false on failure
    }
  };

  const setUsername = (name: string) => {
    setUsernameState(name);
    sessionStorage.setItem("username", name);
    // sessionStorage.setItem("authToken", authToken || "");
  };

  // Create new question (Teacher only)
  const createQuestion = async (
    text: string,
    options: string[],
    timer: number
  ) => {
    // console.log("Creating question with text:", text);
    if (!pollRoom) return;
    console.log("Creating question with text:", text);

    try {
      const response = await axios.post(
        `/api/poll/${pollRoom.code}/question`,
        { text, options, timer },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setPollRoom((prev) =>
        prev
          ? {
              ...prev,
              questions: [...prev.questions, response.data],
            }
          : null
      );
      activateQuestion(response.data.id);
    } catch (error) {
      console.error("Error creating question:", error);
      throw error;
    }
  };

  // Activate question (Teacher only)
  const activateQuestion = async (questionId: string) => {
    if (!pollRoom) return;

    try {
      await axios.post(
        `/api/poll/${pollRoom.code}/question/${questionId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // Update local state optimistically with proper typing
      setPollRoom((prev) => {
        if (!prev) return null;

        // Find the question that was activated
        const question = prev.questions.find((q) => q.id === questionId);
        if (!question) return prev;

        const activeQuestion: Question = {
          ...question,
          status: "ACTIVE" as const,
        };

        // Update the question status in the questions array
        const updatedQuestions = prev.questions.map((q) =>
          q.id === questionId ? activeQuestion : q
        );

        // Return a properly typed PollRoom
        return {
          ...prev,
          activeQuestion,
          questions: updatedQuestions,
        };
      });
    } catch (error) {
      console.error("Error activating question:", error);
      throw error;
    }
  };

  // Submit answer (Student only)
  const submitAnswer = async (questionId: string, optionId: string) => {
    if (!pollRoom || role !== "student") return;

    try {
      await axios.post(
        `/api/poll/${pollRoom.code}/question/${questionId}/answer`,
        { optionId },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw error;
    }
  };

  const handleSetUsername = async (name: string): Promise<boolean> => {
    try {
      const response = await axios.post(
        "/api/user", // Backend route to store username
        { username: name },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.status === 200) {
        setUsername(name);
        // console.log("Username set successfully:", response.data);
        sessionStorage.setItem("authToken", response.data.token);
        setAuthToken(response.data.token);
        return true;
      } else {
        console.error("Failed to set username:", response.data);
        return false;
      }
    } catch (error) {
      console.error("Error setting username:", error);
      return false;
    }
  };

  // Get poll history (closed questions with results)
  const getPollHistory = async (code: string): Promise<PollHistory | null> => {
    try {
      const response = await axios.get(`/api/poll/${code}/history`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching poll history:", error);
      return null;
    }
  };

  return (
    <PollContext.Provider
      value={{
        username,
        setUsername,
        setRole,
        role,
        pollRoom,
        createPollRoom,
        handleSetUsername,
        joinPollRoom,
        createQuestion,
        activateQuestion,
        submitAnswer,
        getPollHistory,
        socket,
      }}
    >
      {children}
    </PollContext.Provider>
  );
}

export function usePoll() {
  const context = useContext(PollContext);
  if (context === undefined) {
    throw new Error("usePoll must be used within a PollProvider");
  }
  return context;
}
