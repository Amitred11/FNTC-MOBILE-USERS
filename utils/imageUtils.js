import * as FileSystem from 'expo-file-system';

/**
 * Converts a local file URI (e.g., from ImagePicker) to a Base64 string.
 * Prepends the data URI scheme (e.g., "data:image/jpeg;base64,") for common image types.
 *
 * @param {string} uri - The local file URI (e.g., "file:///var/mobile/...")
 * @returns {Promise<string>} - A promise that resolves to the Base64 string including data URI scheme, or throws an error.
 */
export const uriToBase64 = async (uri) => {
    if (!uri || typeof uri !== 'string') {
        throw new Error('Invalid URI provided for Base64 conversion.');
    }

    try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Infer MIME type from URI extension (basic approach, can be expanded)
        let mimeType = 'application/octet-stream'; // Default
        if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) mimeType = 'image/jpeg';
        else if (uri.endsWith('.png')) mimeType = 'image/png';
        else if (uri.endsWith('.gif')) mimeType = 'image/gif';
        else if (uri.endsWith('.bmp')) mimeType = 'image/bmp';
        else if (uri.endsWith('.webp')) mimeType = 'image/webp';
        // Add more types as needed

        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Failed to convert URI to Base64:', error);
        throw new Error('Could not process image for upload.');
    }
};