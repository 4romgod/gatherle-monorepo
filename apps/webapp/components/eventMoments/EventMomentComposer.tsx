'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { useSession } from 'next-auth/react';

import {
  alpha,
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VideoFileOutlinedIcon from '@mui/icons-material/VideoFileOutlined';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import Tooltip from '@mui/material/Tooltip';
import {
  CreateEventMomentDocument,
  GetEventMomentUploadUrlDocument,
  ReadEventMomentsDocument,
} from '@/data/graphql/query';
import { EventMomentType } from '@/data/graphql/types/graphql';
import { getAuthHeader } from '@/lib/utils/auth';
import { getFileExtension } from '@/lib/utils';
import { EmojiPickerPopover } from '@/components/core/EmojiPickerPopover';
import type { CreateEventMomentMutation } from '@/data/graphql/types/graphql';

type CreatedMoment = CreateEventMomentMutation['createEventMoment'];

interface EventMomentComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (moment: CreatedMoment) => void;
}

const MAX_CAPTION = 280;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 75 * 1024 * 1024; // 75 MB
const MAX_VIDEO_DURATION_SECONDS = 30;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCEPTED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

/** Tailwind content color swatches — stored as token strings in the DB, rendered as exact CSS values.
 *  These are intentional content colors, not UI chrome. They must remain specific hues regardless of theme mode. */
const BG_SWATCHES = [
  { token: 'bg-purple-600', color: '#9333ea' },
  { token: 'bg-blue-600', color: '#2563eb' },
  { token: 'bg-green-600', color: '#16a34a' },
  { token: 'bg-red-600', color: '#dc2626' },
  { token: 'bg-orange-500', color: '#f97316' },
  { token: 'bg-pink-600', color: '#db2777' },
  { token: 'bg-indigo-600', color: '#4f46e5' },
  { token: 'bg-teal-600', color: '#0d9488' },
  { token: 'bg-yellow-400', color: '#facc15' },
  { token: 'bg-cyan-500', color: '#06b6d4' },
];

/** Captures a poster frame from a video file as a JPEG data URL (client-side only). */
async function generateVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const videoEl = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'metadata';
    videoEl.src = objectUrl;

    videoEl.onloadeddata = () => {
      // Seek slightly in to avoid a black first frame
      videoEl.currentTime = Math.min(0.5, videoEl.duration > 0 ? videoEl.duration / 4 : 0.5);
    };

    videoEl.onseeked = () => {
      try {
        const maxW = 640;
        const scale = Math.min(1, maxW / (videoEl.videoWidth || maxW));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((videoEl.videoWidth || 320) * scale);
        canvas.height = Math.round((videoEl.videoHeight || 180) * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        cleanup();
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } catch {
        cleanup();
        resolve(null);
      }
    };

    videoEl.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export default function EventMomentComposer({ eventId, open, onClose, onCreated }: EventMomentComposerProps) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  const [activeTab, setActiveTab] = useState(0);
  const [caption, setCaption] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_SWATCHES[0].token);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKey, setMediaKey] = useState<string | null>(null);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Emoji picker
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const isEmojiPickerOpen = Boolean(emojiAnchorEl);

  const captionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const captionSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Tracks the current object URL for video preview so it can be revoked when cleared
  const videoPreviewUrlRef = useRef<string | null>(null);
  // Holds the last selected file so the upload can be retried without re-selecting
  const pendingFileRef = useRef<{ file: File } | null>(null);

  const [createMoment, { loading: creating }] = useMutation(CreateEventMomentDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const [getUploadUrl] = useMutation(GetEventMomentUploadUrlDocument, {
    context: { headers: getAuthHeader(token) },
  });

  const captureCaptionSelection = useCallback(() => {
    const el = captionInputRef.current;
    if (!el) return;
    captionSelectionRef.current = {
      start: el.selectionStart ?? caption.length,
      end: el.selectionEnd ?? caption.length,
    };
  }, [caption.length]);

  const insertEmojiAtCursor = useCallback(
    (emoji: string) => {
      const { start, end } = captionSelectionRef.current;
      const next = (caption.slice(0, start) + emoji + caption.slice(end)).slice(0, MAX_CAPTION);
      const nextCursor = Math.min(start + emoji.length, MAX_CAPTION);
      setCaption(next);

      window.requestAnimationFrame(() => {
        const el = captionInputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
        captionSelectionRef.current = { start: nextCursor, end: nextCursor };
      });
    },
    [caption],
  );

  const openEmojiPicker = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      captureCaptionSelection();
      setEmojiAnchorEl(event.currentTarget);
    },
    [captureCaptionSelection],
  );

  const closeEmojiPicker = useCallback(() => {
    setEmojiAnchorEl(null);
  }, []);

  const resetMedia = () => {
    if (videoPreviewUrlRef.current) {
      URL.revokeObjectURL(videoPreviewUrlRef.current);
      videoPreviewUrlRef.current = null;
    }
    setMediaPreview(null);
    setMediaKey(null);
    setThumbnailKey(null);
  };

  const handleClose = () => {
    setCaption('');
    setSelectedBg(BG_SWATCHES[0].token);
    resetMedia();
    pendingFileRef.current = null;
    setSubmitError(null);
    setActiveTab(0);
    closeEmojiPicker();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, acceptedTypes: Set<string>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    pendingFileRef.current = { file };
    await uploadFile(file, acceptedTypes);
  };

  const retryUpload = async () => {
    const pending = pendingFileRef.current;
    if (!pending) return;
    const acceptedTypes = ACCEPTED_VIDEO_TYPES.has(pending.file.type) ? ACCEPTED_VIDEO_TYPES : ACCEPTED_IMAGE_TYPES;
    // Reset only the upload result (keep preview) before retrying
    setMediaKey(null);
    setThumbnailKey(null);
    setSubmitError(null);
    await uploadFile(pending.file, acceptedTypes);
  };

  const uploadFile = async (file: File, acceptedTypes: Set<string>) => {
    if (!acceptedTypes.has(file.type)) {
      setSubmitError('Unsupported file type. Please choose a different file.');
      return;
    }

    const isVideo = ACCEPTED_VIDEO_TYPES.has(file.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      setSubmitError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxBytes / 1024 / 1024} MB.`,
      );
      return;
    }

    setSubmitError(null);
    resetMedia();

    // Video files must use an object URL — browsers cannot seek/play data: URLs for video.
    // Images are fine with data URLs (no seeking required).
    let localPreview: string;
    if (isVideo) {
      localPreview = URL.createObjectURL(file);
      videoPreviewUrlRef.current = localPreview;

      // Validate duration client-side before starting the upload.
      const duration = await new Promise<number>((resolve) => {
        const el = document.createElement('video');
        el.preload = 'metadata';
        el.src = localPreview;
        el.onloadedmetadata = () => resolve(el.duration);
        el.onerror = () => resolve(0);
      });
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setSubmitError(`Video is too long (${Math.round(duration)}s). Max ${MAX_VIDEO_DURATION_SECONDS} seconds.`);
        resetMedia();
        return;
      }
    } else {
      localPreview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Preview failed'));
        reader.readAsDataURL(file);
      });
    }
    setMediaPreview(localPreview);

    setUploading(true);
    try {
      const extension = getFileExtension(file);
      if (!extension) throw new Error('Cannot determine file extension');

      const { data, errors: queryErr } = await getUploadUrl({
        variables: {
          eventId,
          extension,
        },
      });
      if (queryErr || !data?.getEventMomentUploadUrl) throw new Error('Failed to get upload URL');

      const { uploadUrl, key } = data.getEventMomentUploadUrl;
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);

      setMediaKey(key);

      // For video moments: generate a poster frame client-side and upload it
      if (ACCEPTED_VIDEO_TYPES.has(file.type)) {
        try {
          const thumbDataUrl = await generateVideoThumbnail(file);
          if (thumbDataUrl) {
            const thumbBlob = await fetch(thumbDataUrl).then((r) => r.blob());
            const { data: thumbData, errors: thumbErr } = await getUploadUrl({
              variables: {
                eventId,
                extension: 'jpg',
              },
            });
            if (!thumbErr && thumbData?.getEventMomentUploadUrl) {
              const { uploadUrl: thumbUploadUrl, key: thumbKey } = thumbData.getEventMomentUploadUrl;
              const thumbRes = await fetch(thumbUploadUrl, {
                method: 'PUT',
                body: thumbBlob,
                headers: { 'Content-Type': 'image/jpeg' },
              });
              if (thumbRes.ok) setThumbnailKey(thumbKey);
            }
          }
        } catch {
          // Thumbnail upload failure is non-blocking — video is still shareable without a poster
        }
      }
    } catch {
      setSubmitError('Upload failed. Please try again.');
      // Keep the preview so the user can retry — don't call resetMedia() here
      setMediaKey(null);
      setThumbnailKey(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      let type: EventMomentType;

      if (activeTab === 0) {
        type = EventMomentType.Text;
        if (!caption.trim()) {
          setSubmitError('Please write something to share.');
          return;
        }
      } else if (activeTab === 1) {
        type = EventMomentType.Image;
        if (!mediaKey) {
          setSubmitError('Please select a photo to share.');
          return;
        }
      } else {
        type = EventMomentType.Video;
        if (!mediaKey) {
          setSubmitError('Please select a video to share.');
          return;
        }
      }

      const input = {
        eventId,
        type,
        ...(caption.trim() ? { caption: caption.trim() } : {}),
        ...(type === EventMomentType.Text ? { background: selectedBg } : {}),
        ...(mediaKey ? { mediaKey } : {}),
        ...(thumbnailKey ? { thumbnailKey } : {}),
      };

      const { data } = await createMoment({
        variables: { input },
        refetchQueries: [
          {
            query: ReadEventMomentsDocument,
            variables: { eventId, limit: 50 },
            context: { headers: getAuthHeader(token) },
          },
        ],
      });
      if (data?.createEventMoment) {
        onCreated(data.createEventMoment);
        handleClose();
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    }
  };

  const submitDisabled = creating || uploading;

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: '90vh',
            overflow: 'auto',
          },
        }}
      >
        {/* Constrain inner content width on large screens */}
        <Box sx={{ maxWidth: 520, mx: 'auto', width: '100%', p: 2 }}>
          {/* Handle */}
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 2 }} />

          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Share a moment
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => {
              setActiveTab(v);
              setSubmitError(null);
              resetMedia();
            }}
            variant="fullWidth"
            sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Text" />
            <Tab label="Photo" />
            <Tab label="Video" />
          </Tabs>

          {/* Error */}
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {/* Text tab */}
          {activeTab === 0 && (
            <Box>
              {/* Preview card */}
              <Box
                sx={{
                  bgcolor: BG_SWATCHES.find((s) => s.token === selectedBg)?.color ?? BG_SWATCHES[0].color,
                  borderRadius: 3,
                  p: 3,
                  mb: 2,
                  minHeight: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color="common.white"
                  textAlign="center"
                  sx={{ opacity: caption.trim() ? 1 : 0.4, lineHeight: 1.4 }}
                >
                  {caption.trim() || 'Your message here…'}
                </Typography>
              </Box>

              {/* Background color picker */}
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                {BG_SWATCHES.map((swatch) => (
                  <Box
                    key={swatch.token}
                    onClick={() => setSelectedBg(swatch.token)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: swatch.color,
                      cursor: 'pointer',
                      border: selectedBg === swatch.token ? '3px solid' : '2px solid transparent',
                      borderColor: selectedBg === swatch.token ? 'primary.main' : 'transparent',
                      outline: selectedBg === swatch.token ? '2px solid' : 'none',
                      outlineColor: selectedBg === swatch.token ? 'common.white' : 'transparent',
                      transition: 'transform 0.15s ease',
                      '&:hover': { transform: 'scale(1.15)' },
                    }}
                  />
                ))}
              </Stack>

              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                placeholder="What's happening at this event?"
                value={caption}
                inputRef={captionInputRef}
                onChange={(e) => {
                  const { value, selectionStart, selectionEnd } = e.target;
                  setCaption(value.slice(0, MAX_CAPTION));
                  captionSelectionRef.current = {
                    start: selectionStart ?? value.length,
                    end: selectionEnd ?? value.length,
                  };
                }}
                onClick={captureCaptionSelection}
                onSelect={captureCaptionSelection}
                onKeyUp={captureCaptionSelection}
                helperText={`${caption.length} / ${MAX_CAPTION}`}
                slotProps={{
                  htmlInput: { maxLength: MAX_CAPTION },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 0.5 }}>
                        <Tooltip title="Add emoji">
                          <IconButton
                            size="small"
                            onClick={openEmojiPicker}
                            sx={{ color: isEmojiPickerOpen ? 'primary.main' : 'text.secondary' }}
                          >
                            <SentimentSatisfiedAltIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          )}

          {/* Photo tab */}
          {activeTab === 1 && (
            <Box>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => handleFileChange(e, ACCEPTED_IMAGE_TYPES)}
              />
              {mediaPreview ? (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <Box
                    component="img"
                    src={mediaPreview}
                    alt="Preview"
                    sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 2 }}
                  />
                  {uploading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: (theme) => alpha(theme.palette.common.black, 0.4),
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircularProgress sx={{ color: 'common.white' }} />
                    </Box>
                  )}
                  <Button size="small" onClick={resetMedia} sx={{ mt: 1, textTransform: 'none' }}>
                    Change photo
                  </Button>
                  {/* Show retry only when preview exists but upload hasn't completed */}
                  {!mediaKey && !uploading && (
                    <Button
                      size="small"
                      color="error"
                      onClick={retryUpload}
                      sx={{ mt: 1, ml: 1, textTransform: 'none' }}
                    >
                      Retry upload
                    </Button>
                  )}
                </Box>
              ) : (
                <Box
                  onClick={() => imageInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    p: 4,
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <ImageOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Tap to choose a photo
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    JPEG, PNG or WebP · max 15 MB
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                placeholder="Add a caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                slotProps={{ htmlInput: { maxLength: MAX_CAPTION } }}
                helperText={`${caption.length} / ${MAX_CAPTION}`}
              />
            </Box>
          )}

          {/* Video tab */}
          {activeTab === 2 && (
            <Box>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                hidden
                onChange={(e) => handleFileChange(e, ACCEPTED_VIDEO_TYPES)}
              />
              {mediaPreview ? (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <Box
                    component="video"
                    src={mediaPreview}
                    muted
                    playsInline
                    controls
                    sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 2 }}
                  />
                  {uploading && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: (theme) => alpha(theme.palette.common.black, 0.4),
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircularProgress sx={{ color: 'common.white' }} />
                    </Box>
                  )}
                  <Button size="small" onClick={resetMedia} sx={{ mt: 1, textTransform: 'none' }}>
                    Change video
                  </Button>
                  {/* Show retry only when preview exists but upload hasn't completed */}
                  {!mediaKey && !uploading && (
                    <Button
                      size="small"
                      color="error"
                      onClick={retryUpload}
                      sx={{ mt: 1, ml: 1, textTransform: 'none' }}
                    >
                      Retry upload
                    </Button>
                  )}
                </Box>
              ) : (
                <Box
                  onClick={() => videoInputRef.current?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    p: 4,
                    mb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <VideoFileOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Tap to choose a video
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    MP4, MOV or WebM · max 30s · max 75 MB
                  </Typography>
                </Box>
              )}
              <TextField
                fullWidth
                placeholder="Add a caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                slotProps={{ htmlInput: { maxLength: MAX_CAPTION } }}
                helperText={`${caption.length} / ${MAX_CAPTION}`}
              />
            </Box>
          )}

          {/* Submit */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={submitDisabled}
            onClick={handleSubmit}
            sx={{ mt: 2, mb: 1, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            startIcon={submitDisabled ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {uploading ? 'Uploading…' : creating ? 'Sharing…' : 'Share moment'}
          </Button>
        </Box>
      </Drawer>

      <EmojiPickerPopover
        anchorEl={emojiAnchorEl}
        onClose={closeEmojiPicker}
        onSelect={insertEmojiAtCursor}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </>
  );
}
