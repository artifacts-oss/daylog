import DiffMatchPatch from 'diff-match-patch';

const dmp = new DiffMatchPatch();

/**
 * Computes a diff patch between old and new text
 * @param oldText - The original text
 * @param newText - The modified text
 * @returns A string representation of the patch that can be stored in the database
 */
export function computeDiff(oldText: string, newText: string): string {
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  const patches = dmp.patch_make(oldText, diffs);
  return dmp.patch_toText(patches);
}

/**
 * Applies a patch to text
 * @param text - The text to apply the patch to
 * @param patchText - The patch string (from computeDiff)
 * @returns The patched text, or null if the patch couldn't be applied
 */
export function applyPatch(text: string, patchText: string): string | null {
  try {
    const patches = dmp.patch_fromText(patchText);
    const [patchedText, results] = dmp.patch_apply(patches, text);

    // Check if all patches were applied successfully
    const allSuccessful = results.every((result) => result === true);

    if (!allSuccessful) {
      return null;
    }

    return patchedText;
  } catch (error) {
    console.error('Error applying patch:', error);
    return null;
  }
}

/**
 * Validates if a patch can be applied to the given text
 * @param text - The text to validate against
 * @param patchText - The patch string
 * @returns true if the patch can be applied, false otherwise
 */
export function validatePatch(text: string, patchText: string): boolean {
  try {
    const patches = dmp.patch_fromText(patchText);
    const [, results] = dmp.patch_apply(patches, text);
    return results.every((result) => result === true);
  } catch (error) {
    return false;
  }
}

/**
 * Checks if two texts are identical
 * @param text1 - First text
 * @param text2 - Second text
 * @returns true if texts are identical
 */
export function areTextsIdentical(text1: string, text2: string): boolean {
  return text1 === text2;
}

/**
 * Gets a summary of changes from a diff patch
 * @param patchText - The patch string
 * @returns Object with counts of additions and deletions
 */
export function getDiffSummary(patchText: string): {
  additions: number;
  deletions: number;
} {
  try {
    const patchesString = dmp.patch_fromText(patchText);
    const patches = patchesString as any[];
    let additions = 0;
    let deletions = 0;

    patches.forEach((patch) => {
      patch.diffs.forEach(([operation, text]: [number, string]) => {
        if (operation === 1) {
          // DIFF_INSERT
          additions += text.length;
        } else if (operation === -1) {
          // DIFF_DELETE
          deletions += text.length;
        }
      });
    });

    return { additions, deletions };
  } catch (error) {
    return { additions: 0, deletions: 0 };
  }
}

/**
 * Gets a preview of the text changed in a diff patch
 * @param patchText - The patch string
 * @param maxLength - Maximum length of the preview
 * @returns A string preview of the additions in the patch
 */
export function getDiffPreview(patchText: string, maxLength = 80): string {
  try {
    const patches = dmp.patch_fromText(patchText) as any[];
    let previewContent = '';

    patches.forEach((patch) => {
      patch.diffs.forEach(([operation, text]: [number, string]) => {
        if (operation === 1) {
          // DIFF_INSERT
          previewContent += text;
        }
      });
    });

    if (previewContent.length === 0) {
      // If no insertions, try to show context or deletions
      patches.slice(0, 1).forEach((patch) => {
        patch.diffs.forEach(([operation, text]: [number, string]) => {
          if (operation === 0 || operation === -1) {
            previewContent += text;
          }
        });
      });
    }

    // Clean up whitespace and newlines for a single-line preview
    const cleanPreview = previewContent.replace(/\s+/g, ' ').trim();

    if (cleanPreview.length > maxLength) {
      return cleanPreview.substring(0, maxLength) + '...';
    }

    return cleanPreview || 'No text changes';
  } catch (error) {
    return 'Error generating preview';
  }
}
