"use client";

import { useRef, useEffect, useState } from "react";
import { YouTubeVideo } from "@/app/api/client";

interface YouTubeSearchResultsProps {
  isSearching: boolean;
  showResults: boolean;
  searchResults: YouTubeVideo[];
  onSelectVideo: (video: YouTubeVideo) => void;
  onClickOutside: () => void;
  timestamp?: number | null; // Optional timestamp when the results were cached
}

export const YouTubeSearchResults = ({
  isSearching,
  showResults,
  searchResults,
  onSelectVideo,
  onClickOutside,
  timestamp,
}: YouTubeSearchResultsProps) => {
  const resultsRef = useRef<HTMLDivElement>(null);

  // Calculate time remaining until cache expiration (20 minutes)
  const getCacheTimeRemaining = (): number | null => {
    if (!timestamp) return null;

    const now = Date.now();
    const expirationTime = timestamp + 20 * 60 * 1000; // 20 minutes in milliseconds
    const timeRemaining = expirationTime - now;

    // Return null if already expired or no timestamp
    return timeRemaining > 0 ? timeRemaining : null;
  };

  // State to track time remaining
  const [timeRemaining, setTimeRemaining] = useState<number | null>(getCacheTimeRemaining());

  // Update time remaining every second
  useEffect(() => {
    if (!timestamp) return;

    // Create a function that uses the latest timestamp
    const updateTimeRemaining = () => {
      const now = Date.now();
      const expirationTime = timestamp + 20 * 60 * 1000; // 20 minutes in milliseconds
      const timeRemaining = expirationTime - now;

      // Return null if already expired or no timestamp
      setTimeRemaining(timeRemaining > 0 ? timeRemaining : null);
    };

    // Update immediately
    updateTimeRemaining();

    // Set up interval to update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  // Format time remaining for display
  const formatTimeRemaining = (): string => {
    if (!timeRemaining) return "";

    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle click outside to close the results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        // Check if the click was on the input field
        const target = event.target as HTMLElement;
        const isInputField =
          target.id === "youtube_url" ||
          target.id === "video_url" ||
          target.closest('input[id="youtube_url"]') ||
          target.closest('input[id="video_url"]');

        // Only close if not clicking on the input field
        if (!isInputField) {
          onClickOutside();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClickOutside]);

  if (!showResults) {
    return null;
  }

  return (
    <div
      ref={resultsRef}
      className="absolute z-100 mt-1 w-full bg-neutral-950 text-gray-100 border border-neutral-700 rounded-md shadow-lg max-h-80 overflow-y-auto custom-scrollbar"
    >
      {/* Cache expiration indicator */}
      {timeRemaining !== null && (
        <div className="absolute top-1 right-1 z-10">
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
            Cache expires in {formatTimeRemaining()}
          </span>
        </div>
      )}

      {!isSearching && searchResults.length === 0 ? (
        <div className="p-3 text-center">
          No results found
        </div>
      ) : (
        <ul className="divide-y divide-neutral-700">
          {searchResults.map((video) => (
            <li
              key={video.id}
              className="p-2 hover:bg-gray-100 hover:bg-gray-700 cursor-pointer"
              onClick={() => onSelectVideo(video)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-24 h-16 relative overflow-hidden rounded">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      // Fallback to default YouTube thumbnail if the image fails to load
                      const target = e.target as HTMLImageElement;
                      console.log(
                        `Image error for ${video.id}, using fallback`
                      );
                      target.onerror = null; // Prevent infinite loop
                      target.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-70  text-xs px-1 rounded">
                    {video.duration}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {video.title}
                  </p>
                  <p className="text-xs mt-1">
                    {video.channel}
                  </p>
                </div>
              </div>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
