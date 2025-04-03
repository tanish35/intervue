"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePoll } from "@/contexts/PollContext";

export default function CreatePollRoom() {
  const navigate = useNavigate();
  const { username, createPollRoom } = usePoll();

  useEffect(() => {
    if (!sessionStorage.getItem("authToken")) {
      navigate("/teacher/username");
    }
  }, [username, navigate]);

  const handleCreateRoom = async () => {
    try {
      const success = await createPollRoom();
      if (success) {
        navigate("/teacher/dashboard");
      } else {
        console.error("Failed to create poll room.");
      }
    } catch (error) {
      console.error("Error creating poll room:", error);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-block bg-purple-600 text-white text-xs px-2 py-1 rounded-full mb-2">
            Intervue Poll
          </div>
          <h1 className="text-2xl font-bold mb-2">Create a Poll Room</h1>
          <p className="text-gray-500 text-sm">
            Create a new poll room where students can join and participate in
            your polls.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 mb-4">
              When you create a poll room, a unique code will be generated that
              students can use to join your session.
            </p>
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Create Poll Room
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
