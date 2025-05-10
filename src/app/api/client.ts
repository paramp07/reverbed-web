import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface VideoProcessRequest {
  youtube_url: string;
  video_url?: string;  // Optional separate video URL for video processing
  audio_speed?: number;
  room_size?: number;
  damping?: number;
  wet_level?: number;
  dry_level?: number;
  start_time?: string;
  end_time?: string;
  loop_video?: boolean;
}

export interface PreviewRequest {
  youtube_url: string;
  audio_speed?: number;
  room_size?: number;
  damping?: number;
  wet_level?: number;
  dry_level?: number;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  result_file?: string;
  error?: string;
  used_cache?: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
  url: string;
}

export interface YouTubeSearchResponse {
  videos: YouTubeVideo[];
}

export const processVideo = async (request: VideoProcessRequest): Promise<JobStatus> => {
  const response = await axios.post(`${API_BASE_URL}/process`, request);
  return response.data;
};

export const previewAudio = async (request: PreviewRequest): Promise<JobStatus> => {
  const response = await axios.post(`${API_BASE_URL}/preview`, request);
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await axios.get(`${API_BASE_URL}/status/${jobId}`);
  return response.data;
};

export const getDownloadUrl = (jobId: string): string => {
  return `${API_BASE_URL}/download/${jobId}`;
};

export const downloadFile = async (jobId: string): Promise<void> => {
  try {
    console.log(`Starting download for job ${jobId}`);

    // First, check the job status to make sure it's completed
    const status = await getJobStatus(jobId);
    console.log(`Job status:`, status);

    if (status.status !== 'completed') {
      throw new Error(`Job is not completed. Current status: ${status.status}`);
    }

    if (!status.result_file) {
      throw new Error('No result file available for this job');
    }

    console.log(`Result file: ${status.result_file}`);

    // Get the file directly using axios with responseType blob
    const response = await axios.get(`${API_BASE_URL}/download/${jobId}`, {
      responseType: 'blob'
    });

    console.log(`Download response received. Content type: ${response.headers['content-type']}`);

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Try to get the filename from the Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = `reverbed_${jobId}`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
        console.log(`Filename from Content-Disposition: ${filename}`);
      }
    } else {
      // Use the result_file from the job status
      filename = status.result_file;
      console.log(`Using filename from job status: ${filename}`);
    }

    // Add extension based on content type if not present
    if (!filename.includes('.')) {
      const contentType = response.headers['content-type'];
      console.log(`Adding extension based on content type: ${contentType}`);
      if (contentType === 'video/mp4') {
        filename += '.mp4';
      } else if (contentType === 'audio/mpeg') {
        filename += '.mp3';
      } else if (contentType === 'audio/wav') {
        filename += '.wav';
      }
    }

    console.log(`Final filename for download: ${filename}`);

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);

    console.log('Download completed successfully');
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

export const listJobs = async (): Promise<JobStatus[]> => {
  const response = await axios.get(`${API_BASE_URL}/jobs`);
  return response.data;
};

export const searchYouTube = async (query: string, limit: number = 5): Promise<YouTubeVideo[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: { query, limit }
    });
    return response.data.videos;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
};
