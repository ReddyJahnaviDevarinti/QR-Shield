export interface CameraErrorInfo {
  title: string;
  message: string;
  code?: string;
}

/**
 * Checks whether the browser and current context support camera access via MediaDevices.
 * Requires HTTPS or localhost secure context in modern browsers.
 */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(
      navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function',
    )
  );
}

/**
 * Formats browser DOMExceptions, Error instances, and runtime errors into clear, actionable messages.
 * Uses duck-typing (checking .name and .message) to be resilient across execution realms (jsdom/iframe/worker).
 */
export function formatCameraErrorMessage(err: unknown): CameraErrorInfo {
  if (err && typeof err === 'object') {
    const errorObj = err as { name?: string; message?: string };
    const name = typeof errorObj.name === 'string' ? errorObj.name : '';
    const message = typeof errorObj.message === 'string' ? errorObj.message : '';

    if (message === 'UNSUPPORTED_BROWSER') {
      return {
        title: 'Camera Not Supported',
        message:
          'Camera scanning is not supported by this browser or in an insecure context. Please ensure you are connected over HTTPS.',
        code: 'E_CAMERA_UNSUPPORTED',
      };
    }

    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          title: 'Camera Permission Denied',
          message:
            'Camera access was blocked. Please click the camera/lock icon in your browser address bar, set Camera to "Allow", and try again.',
          code: 'E_CAMERA_PERMISSION_DENIED',
        };
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          title: 'No Camera Detected',
          message:
            'No video capture device was found on your computer. Please check that your webcam is connected and enabled, or upload an image file instead.',
          code: 'E_CAMERA_NOT_FOUND',
        };
      case 'NotReadableError':
      case 'TrackStartError':
        return {
          title: 'Camera In Use',
          message:
            'The camera could not be started because it is in use by another application or browser tab. Please close other video programs and try again.',
          code: 'E_CAMERA_IN_USE',
        };
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return {
          title: 'Camera Constraint Error',
          message:
            'Your camera hardware does not support the requested video settings. Please try uploading an image file instead.',
          code: 'E_CAMERA_OVERCONSTRAINED',
        };
      case 'SecurityError':
        return {
          title: 'Insecure Context',
          message:
            'Camera access is restricted to secure origins. Please ensure you are connected over HTTPS or localhost.',
          code: 'E_CAMERA_SECURITY',
        };
      case 'AbortError':
        return {
          title: 'Camera Access Interrupted',
          message:
            'The camera initialization was interrupted. Please try launching the camera again.',
          code: 'E_CAMERA_ABORTED',
        };
      default:
        return {
          title: 'Camera Initialization Failed',
          message:
            message ||
            'Unable to access the device camera. Please check permissions and try again.',
          code: 'E_CAMERA_FAILED',
        };
    }
  }

  return {
    title: 'Camera Error',
    message: 'An unknown error occurred while initializing the camera.',
    code: 'E_CAMERA_UNKNOWN',
  };
}

/**
 * Initializes the camera stream with sequential fallbacks.
 * Laptops typically only have user-facing webcams and may fail on environment constraints.
 * This function tries:
 *   1. Ideal environment facing with HD resolution
 *   2. Ideal environment facing with unconstrained resolution
 *   3. Unconstrained video: true (universal fallback for laptop/desktop webcams)
 */
export async function getCameraStream(): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new Error('UNSUPPORTED_BROWSER');
  }

  const attempts: MediaStreamConstraints[] = [
    // 1. High-definition with ideal environment facing (rear on phones, fallback on laptops)
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    // 2. Unconstrained resolution with ideal environment facing
    {
      video: {
        facingMode: { ideal: 'environment' },
      },
      audio: false,
    },
    // 3. Basic unconstrained video (compatible with all laptop and desktop webcams)
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: unknown = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
      lastError = err;
      if (err && typeof err === 'object') {
        const errName = (err as { name?: string }).name;
        // Permission denial or security errors will not succeed with different constraints; bail immediately.
        if (
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError'
        ) {
          throw err;
        }
      }
    }
  }

  throw lastError;
}
