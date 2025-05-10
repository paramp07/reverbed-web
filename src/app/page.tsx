"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  processVideo,
  previewAudio,
  getJobStatus,
  getDownloadUrl,
  downloadFile,
  searchYouTube,
  VideoProcessRequest,
  JobStatus,
  YouTubeVideo,
} from "./api/client";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SliderWithInput } from "@/components/ui/slider-with-input";
import { Button } from "@/components/ui/button";
import { YouTubeSearchResults } from "@/components/ui/youtube-search-results";
import { Download } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// Create a simple custom audio player component
const CustomAudioPlayer = ({ src }: { src: string }) => {
  return (
    <div className="w-full rounded-md overflow-hidden bg-gray-800 p-3">
      <audio controls className="w-full" src={src} autoPlay>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

// Create a simple custom video player component
const CustomVideoPlayer = ({ src }: { src: string }) => {
  return (
    <div className="w-full rounded-md overflow-hidden bg-gray-800 p-3">
      <video controls className="w-full" src={src} autoPlay>
        Your browser does not support the video element.
      </video>
    </div>
  );
};

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<JobStatus | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  // State variables for UI sections
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResultsTimestamp, setSearchResultsTimestamp] = useState<number | null>(null);

  const [videoSearchResults, setVideoSearchResults] = useState<YouTubeVideo[]>([]);
  const [isVideoSearching, setIsVideoSearching] = useState(false);
  const [showVideoSearchResults, setShowVideoSearchResults] = useState(false);
  const [videoSearchResultsTimestamp, setVideoSearchResultsTimestamp] = useState<number | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheExpirationRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VideoProcessRequest>({
    defaultValues: {
      audio_speed: 0.2,
      room_size: 0.75,
      damping: 0.5,
      wet_level: 0.08,
      dry_level: 0.2
    }
  });
  const youtubeUrl = watch("youtube_url", "");
  const videoUrl = watch("video_url", "") || "";

  // Ensure form values are set when component mounts
  useEffect(() => {
    // Set initial values for all sliders
    setValue("audio_speed", 0.2);
    setValue("room_size", 0.75);
    setValue("damping", 0.5);
    setValue("wet_level", 0.08);
    setValue("dry_level", 0.2);

    console.log("Initial form values set");
  }, [setValue]);

  // Handle YouTube search when input changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if the input is a valid YouTube URL
    const youtubeUrlRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (youtubeUrlRegex.test(youtubeUrl)) {
      setShowSearchResults(false);
      return;
    }

    // Don't search if the input is empty or too short
    if (!youtubeUrl || youtubeUrl.length < 3) {
      // Don't clear search results here to keep them cached
      setShowSearchResults(false);
      return;
    }

    // Set a timeout to avoid making too many requests while typing
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchYouTube(youtubeUrl);
        console.log("Search results:", results);

        // Ensure all thumbnails have valid URLs
        const processedResults = results.map((video) => {
          if (!video.thumbnail || !video.thumbnail.startsWith("http")) {
            console.log(`Fixing thumbnail for video ${video.id}`);
            return {
              ...video,
              thumbnail: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
            };
          }
          return video;
        });

        console.log("Processed results:", processedResults);
        setSearchResults(processedResults);
        setShowSearchResults(processedResults.length > 0);
        // Update timestamp when search results are updated
        setSearchResultsTimestamp(Date.now());
      } catch (error) {
        console.error("Error searching YouTube:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [youtubeUrl]);

  // Handle video URL search when input changes
  useEffect(() => {
    // Clear previous timeout
    if (videoSearchTimeoutRef.current) {
      clearTimeout(videoSearchTimeoutRef.current);
    }

    // Don't search if the input is a valid YouTube URL
    const youtubeUrlRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (youtubeUrlRegex.test(videoUrl)) {
      setShowVideoSearchResults(false);
      return;
    }

    // Don't search if the input is empty or too short
    if (!videoUrl || videoUrl.length < 3) {
      // Don't clear search results here to keep them cached
      setShowVideoSearchResults(false);
      return;
    }

    // Set a timeout to avoid making too many requests while typing
    videoSearchTimeoutRef.current = setTimeout(async () => {
      setIsVideoSearching(true);
      try {
        const results = await searchYouTube(videoUrl);
        console.log("Video search results:", results);

        // Ensure all thumbnails have valid URLs
        const processedResults = results.map((video) => {
          if (!video.thumbnail || !video.thumbnail.startsWith("http")) {
            console.log(`Fixing thumbnail for video ${video.id}`);
            return {
              ...video,
              thumbnail: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
            };
          }
          return video;
        });

        console.log("Processed video results:", processedResults);
        setVideoSearchResults(processedResults);
        setShowVideoSearchResults(processedResults.length > 0);
        // Update timestamp when video search results are updated
        setVideoSearchResultsTimestamp(Date.now());
      } catch (error) {
        console.error("Error searching YouTube for video:", error);
      } finally {
        setIsVideoSearching(false);
      }
    }, 500);

    return () => {
      if (videoSearchTimeoutRef.current) {
        clearTimeout(videoSearchTimeoutRef.current);
      }
    };
  }, [videoUrl]);

  // This effect was moved to the YouTubeSearchResults component

  // Cache expiration effect - clear search results after 20 minutes
  useEffect(() => {
    // Clear any existing interval
    if (cacheExpirationRef.current) {
      clearInterval(cacheExpirationRef.current);
    }

    // Function to check and clear expired caches
    const clearExpiredCaches = () => {
      const now = Date.now();
      const CACHE_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes in milliseconds

      // Check main search results
      if (searchResultsTimestamp && (now - searchResultsTimestamp > CACHE_EXPIRATION_TIME)) {
        console.log("Clearing expired main search results cache");
        setSearchResults([]);
        setSearchResultsTimestamp(null);
      }

      // Check video search results
      if (videoSearchResultsTimestamp && (now - videoSearchResultsTimestamp > CACHE_EXPIRATION_TIME)) {
        console.log("Clearing expired video search results cache");
        setVideoSearchResults([]);
        setVideoSearchResultsTimestamp(null);
      }
    };

    // Only set up the timeout if we have cached results
    if (searchResultsTimestamp || videoSearchResultsTimestamp) {
      console.log("Setting up cache expiration timer (20 minutes)");
      // Check every minute for expired caches
      cacheExpirationRef.current = setInterval(clearExpiredCaches, 60 * 1000);

      // Also run once immediately to check for already expired caches
      clearExpiredCaches();
    }

    return () => {
      if (cacheExpirationRef.current) {
        clearInterval(cacheExpirationRef.current);
      }
    };
  }, [searchResultsTimestamp, videoSearchResultsTimestamp]);

  // Handle selecting a video from search results
  const handleSelectVideo = (video: YouTubeVideo) => {
    setValue("youtube_url", video.url);
    setShowSearchResults(false);
  };

  // Handle selecting a video for the video processing feature
  const handleSelectVideoForProcessing = (video: YouTubeVideo) => {
    setValue("video_url", video.url);
    // Automatically set loop_video to true when a video URL is provided
    setValue("loop_video", true);
    setShowVideoSearchResults(false);
  };

  // Poll for job status updates
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);
        setJobStatus(status);

        // Log the job status response
        console.log("Process job status:", status);
        if (status.used_cache) {
          console.log("PROCESS CACHE: Using cached audio");
        }

        if (status.status === "completed") {
          toast.success("Processing completed successfully!");
          clearInterval(interval);
          setIsProcessing(false);
          console.log("Process completed, result file:", status.result_file);
        } else if (status.status === "failed") {
          toast.error(`Processing failed: ${status.error}`);
          clearInterval(interval);
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("Error fetching job status:", error);
        toast.error("Failed to get processing status");
        clearInterval(interval);
        setIsProcessing(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  // Poll for preview job status updates
  useEffect(() => {
    if (!previewJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(previewJobId);
        setPreviewStatus(status);

        // Log the job status response which includes cache information
        console.log("Preview job status:", status);
        if (status.used_cache) {
          console.log("PREVIEW CACHE: Using cached audio");
        }

        if (status.status === "completed") {
          toast.success("Preview ready!");
          clearInterval(interval);
          setIsPreviewing(false);

          // Set the audio URL for the player
          if (status.result_file) {
            setPreviewAudioUrl(getDownloadUrl(previewJobId));
            console.log("Preview ready, result file:", status.result_file);
          }
        } else if (status.status === "failed") {
          toast.error(`Preview failed: ${status.error}`);
          clearInterval(interval);
          setIsPreviewing(false);
        }
      } catch (error) {
        console.error("Error fetching preview status:", error);
        toast.error("Failed to get preview status");
        clearInterval(interval);
        setIsPreviewing(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [previewJobId]);

  const onSubmit = async (data: VideoProcessRequest) => {
    try {
      // Ensure loop_video is set correctly based on video_url
      if (data.video_url && data.video_url.trim() !== "") {
        data.loop_video = true;
      }

      // Enhanced logging for process button
      console.log("PROCESS BUTTON CLICKED");
      console.log("Processing with data:", data);
      console.log("Audio Effects:", {
        speed: data.audio_speed,
        room_size: data.room_size,
        damping: data.damping,
        wet_level: data.wet_level,
        dry_level: data.dry_level
      });
      console.log("Video Settings:", {
        start_time: data.start_time,
        end_time: data.end_time,
        loop_video: data.loop_video
      });

      setIsProcessing(true);
      const response = await processVideo(data);
      setJobId(response.job_id);
      toast.info("Processing started...");
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error("Failed to start processing");
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    // Check if URL is provided
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL first");
      return;
    }

    try {
      setIsPreviewing(true);
      setPreviewAudioUrl(null); // Clear any previous preview

      // Get current form values
      const formValues = {
        youtube_url: youtubeUrl,
        audio_speed: watch("audio_speed") ?? 0.2, // Ensure audio_speed is set to 0.2 if undefined
        room_size: watch("room_size") ?? 0.75,
        damping: watch("damping") ?? 0.5,
        wet_level: watch("wet_level") ?? 0.08,
        dry_level: watch("dry_level") ?? 0.2,
      };

      // Enhanced logging for preview button
      console.log("PREVIEW BUTTON CLICKED");
      console.log("Preview form values:", formValues);
      console.log("Audio Effects:", {
        speed: formValues.audio_speed,
        room_size: formValues.room_size,
        damping: formValues.damping,
        wet_level: formValues.wet_level,
        dry_level: formValues.dry_level
      });
      console.log("YouTube URL:", formValues.youtube_url);

      // Start preview processing
      const response = await previewAudio(formValues);
      setPreviewJobId(response.job_id);
      toast.info("Generating preview...");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview");
      setIsPreviewing(false);
    }
  };

  return (
    <section className="min-h-screen p-4 bg-zinc-950 ">
      <Card className="p-6 justify-center items-center max-w-2xl mx-auto text-white bg-transparent border-zinc-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center">
          <ToastContainer position="top-right" autoClose={5000} />

          {/* Logo */}
          <div className="flex items-center justify-center mb-2">
            <Image
              src="/logo.png"
              alt="Reverbed Logo"
              width={150}
              height={100}
              style={{ objectFit: 'contain', marginBottom: 0 }}
              priority
            />
          </div>

          <main className="max-w-3xl mx-auto dark:bg-gray-800 p-0 lg:p-8 rounded-lg shadow-md mt-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="relative">
                <label
                  htmlFor="youtube_url"
                  className="block text-sm font-medium mb-1"
                >
                  YouTube URL or Search
                </label>
                <div className="relative">
                  <Input
                    id="youtube_url"
                    type="text"
                    className="flex-1 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 tracking-tight"
                    placeholder="Enter YouTube URL or search for a video..."
                    onFocus={() => {
                      // Show search results when input is focused if we have results and it's not a YouTube URL
                      const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
                      if (searchResults.length > 0 && !youtubeUrlRegex.test(youtubeUrl)) {
                        setShowSearchResults(true);
                      }
                    }}
                    {...register("youtube_url", {
                      required: "YouTube URL is required",
                    })}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Spinner size="small" />
                    </div>
                  )}
                </div>
                {errors.youtube_url && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.youtube_url.message}
                  </p>
                )}

                {/* YouTube search results dropdown */}
                <YouTubeSearchResults
                  isSearching={isSearching}
                  showResults={showSearchResults}
                  searchResults={searchResults}
                  onSelectVideo={handleSelectVideo}
                  onClickOutside={() => setShowSearchResults(false)}
                  timestamp={searchResultsTimestamp}
                />
              </div>

              <div>
                <SliderWithInput
                  label="Audio Speed"
                  minValue={0.1}
                  maxValue={1.0}
                  initialValue={0.2}
                  defaultValue={0.2}
                  step={0.1}
                  onChange={(value) => {
                    setValue("audio_speed", value);
                    console.log("Audio speed changed to:", value);
                  }}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-4 dark:bg-gray-700 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <SliderWithInput
                        label="Room Size"
                        minValue={0}
                        maxValue={1}
                        initialValue={0.75}
                        defaultValue={0.75}
                        step={0.05}
                        onChange={(value) => setValue("room_size", value)}
                      />
                    </div>
                    <div>
                      <SliderWithInput
                        label="Damping"
                        minValue={0}
                        maxValue={1}
                        initialValue={0.5}
                        defaultValue={0.5}
                        step={0.05}
                        onChange={(value) => setValue("damping", value)}
                      />
                    </div>
                    <div>
                      <SliderWithInput
                        label="Wet Level"
                        minValue={0}
                        maxValue={1}
                        initialValue={0.08}
                        defaultValue={0.08}
                        step={0.01}
                        onChange={(value) => setValue("wet_level", value)}
                      />
                    </div>
                    <div>
                      <SliderWithInput
                        label="Dry Level"
                        minValue={0}
                        maxValue={1}
                        initialValue={0.2}
                        defaultValue={0.2}
                        step={0.01}
                        onChange={(value) => setValue("dry_level", value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 dark:bg-gray-700 rounded-md">
                  <div className="border-b pb-4 mb-4">
                    <div>
                      <label
                        htmlFor="video_url"
                        className="block text-sm font-medium mb-1"
                      >
                        Video Processing (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Leave empty for audio only, or enter a YouTube URL to process and loop video.
                        Adding a video URL will automatically enable video processing.
                      </p>
                      <div className="relative">
                        <Input
                          id="video_url"
                          type="text"
                          className="flex-1 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 font-mono tracking-tight"
                          placeholder="Enter YouTube URL for video (optional)..."
                          onFocus={() => {
                            // Show search results when input is focused if we have results and it's not a YouTube URL
                            const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
                            if (videoSearchResults.length > 0 && !youtubeUrlRegex.test(videoUrl)) {
                              setShowVideoSearchResults(true);
                            }
                          }}
                          {...register("video_url", {
                            onChange: (e) => {
                              // Automatically set loop_video to true if video URL is provided
                              setValue("loop_video", e.target.value.trim() !== "");
                            }
                          })}
                        />

                        {/* YouTube search results dropdown for video */}
                        <YouTubeSearchResults
                          isSearching={isVideoSearching}
                          showResults={showVideoSearchResults}
                          searchResults={videoSearchResults}
                          onSelectVideo={(video) => {
                            handleSelectVideoForProcessing(video);
                            // Automatically set loop_video to true when a video is selected
                            setValue("loop_video", true);
                          }}
                          onClickOutside={() => setShowVideoSearchResults(false)}
                          timestamp={videoSearchResultsTimestamp}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="start_time"
                        className="block text-sm font-medium mb-1"
                      >
                        Start Time (MM:SS)
                      </label>
                      <Input
                        id="start_time"
                        type="text"
                        className="flex-1 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 font-mono tracking-tight"
                        placeholder="0:00"
                        {...register("start_time")}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="end_time"
                        className="block text-sm font-medium mb-1"
                      >
                        End Time (MM:SS)
                      </label>
                      <Input
                        id="end_time"
                        type="text"
                        className="flex-1 text-sm bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400 font-mono tracking-tight"
                        placeholder="1:00"
                        {...register("end_time")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  onClick={handlePreview}
                  disabled={isProcessing || isPreviewing}
                  className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-black dark:text-zinc-900 font-mono tracking-wide uppercase text-sm"
                >
                  {isPreviewing ? "Generating Preview..." : "Preview (15-35s)"}
                </Button>

                <Button
                  type="submit"
                  disabled={isProcessing || isPreviewing}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-mono tracking-wide uppercase text-sm"
                >
                  {isProcessing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Process & Download</span>
                  </>
                )}
                </Button>
              </div>
            </form>

            {/* Preview processing status */}
            {isPreviewing && previewStatus && (
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h3 className="text-lg font-medium mb-2">Preview Status</h3>
                <div className="flex items-center mb-2">
                  <div className="loader mr-3"></div>
                  <span>
                    Generating preview (
                    {Math.round(previewStatus.progress * 100)}
                    %)
                    {previewStatus.used_cache && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Using cached audio
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      previewStatus.used_cache ? "bg-blue-600" : "bg-green-600"
                    }`}
                    style={{ width: `${previewStatus.progress * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Full processing status */}
            {isProcessing && jobStatus && (
              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <h3 className="text-lg font-medium mb-2">Processing Status</h3>
                <div className="flex items-center mb-2">
                  <div className="loader mr-3"></div>
                  <span>
                    {jobStatus.status} ({Math.round(jobStatus.progress * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${jobStatus.progress * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Preview player */}
            {previewAudioUrl && previewStatus && (
              <div
                className={`mt-8 p-4 ${
                  previewStatus.used_cache
                    ? "bg-blue-900"
                    : "bg-green-900"
                } rounded-md`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium mb-2">Preview Ready!</h3>
                  {previewStatus.used_cache && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Used cached audio
                    </span>
                  )}
                </div>
                <p className="mb-4">
                  Listen to a 20-second preview with your selected effects.
                  {previewStatus.used_cache && (
                    <span className="block text-sm text-blue-600 mt-1">
                      Using previously downloaded audio for faster preview.
                    </span>
                  )}
                </p>
                <div className="w-full">
                  {/* Use our custom audio player */}
                  <CustomAudioPlayer src={previewAudioUrl} />
                </div>
              </div>
            )}

            {/* Full processing result */}
            {jobStatus &&
              jobStatus.status === "completed" &&
              jobStatus.result_file && (
                <div className="mt-8 p-4 bg-green-900 rounded-md">
                  <h3 className="text-lg font-medium mb-2">
                    Processing Complete!
                  </h3>
                  <p className="mb-4">
                    Your processed file is ready for download.
                  </p>

                  {/* Show video player if the result is a video file */}
                  {jobStatus.result_file.endsWith(".mp4") && (
                    <div className="mb-4">
                      <h4 className="text-md font-medium mb-2">
                        Video Preview:
                      </h4>
                      <CustomVideoPlayer src={getDownloadUrl(jobId!)} />
                    </div>
                  )}

                  {/* Show audio player if the result is an audio file */}
                  {jobStatus.result_file.endsWith(".mp3") && (
                    <div className="mb-4">
                      <h4 className="text-md font-medium mb-2">
                        Audio Preview:
                      </h4>
                      <CustomAudioPlayer src={getDownloadUrl(jobId!)} />
                    </div>
                  )}

                  <button
                    type="button"
                    className="inline-block bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
                    onClick={async () => {
                      try {
                        console.log("Download URL:", getDownloadUrl(jobId!));
                        console.log("Job status:", jobStatus);
                        toast.info("Starting download...");
                        await downloadFile(jobId!);
                        toast.success("Download successful!");
                      } catch (error) {
                        console.error("Download error:", error);
                        toast.error(
                          "Download failed. Check console for details."
                        );
                      }
                    }}
                  >
                    Download File
                  </button>
                </div>
              )}
          </main>

          <p className="text-sm mt-5 text-zinc-400 tracking-[0.5em] uppercase">
            Reverbed
          </p>
        </div>
      </Card>
    </section>
  );
}
