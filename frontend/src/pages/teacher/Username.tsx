"use client";

import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePoll } from "@/contexts/PollContext";

export default function TeacherUsername() {
  const navigate = useNavigate();
  const { handleSetUsername } = usePoll();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (name.trim()) {
      try {
        const success = await handleSetUsername(name);
        if (success) {
          navigate("/teacher/create-room");
        } else {
          setError("Failed to set username. Please try again.");
        }
      } catch (error) {
        console.error("Error setting username:", error);
        setError("An error occurred while setting your username.");
      }
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-2">
            Intervue Poll
          </div>
          <h1 className="text-2xl font-bold mb-2">Let's Get Started</h1>
          <p className="text-gray-500 text-sm">
            You'll have the ability to create and manage polls, ask questions,
            and monitor your students' responses in real-time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-1"
            >
              Enter your Name
            </label>
            <Input
              id="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full"
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={!name.trim()}
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
