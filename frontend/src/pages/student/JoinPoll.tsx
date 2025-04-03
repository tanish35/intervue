import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePoll } from "@/contexts/PollContext";

export default function JoinPoll() {
  const navigate = useNavigate();
  const { username, joinPollRoom } = usePoll();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("authToken")) {
      navigate("/student/username");
    }
  }, [username, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (code.trim()) {
        const success = await joinPollRoom(code);
        if (success) {
          navigate("/student/waiting");
        } else {
          setError("Invalid poll code. Please try again.");
        }
      }
    } catch (err) {
      console.error("Error joining poll:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-2">
            Intervue Poll
          </div>
          <h1 className="text-2xl font-bold mb-2">Join a Poll</h1>
          <p className="text-gray-500 text-sm">
            Enter the poll code provided by your teacher to join the session.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pollCode"
              className="block text-sm font-medium mb-1"
            >
              Enter Poll Code
            </label>
            <Input
              id="pollCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              className={`w-full text-center text-lg font-medium tracking-wider ${
                error ? "border-red-500" : ""
              }`}
              maxLength={15}
              required
              disabled={isLoading}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1" role="alert">
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className={`w-full ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
            disabled={!code.trim() || isLoading}
          >
            {isLoading ? "Joining..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
