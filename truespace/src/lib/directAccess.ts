/**
 * Helper functions for handling emergency direct access
 */

/**
 * Check if there's a direct access token for a specific course
 * @param courseId The course ID to check access for
 * @returns True if there's a direct access token for this course
 */
export function hasDirectAccessToken(courseId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('directAccessToken');
  const tokenCourse = localStorage.getItem('directAccessCourse');
  
  if (!token || !tokenCourse) return false;
  
  return tokenCourse === courseId;
}

/**
 * Get the direct access token for a course
 * @param courseId The course ID to get the token for
 * @returns The direct access token or null if not found
 */
export function getDirectAccessToken(courseId: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('directAccessToken');
  const tokenCourse = localStorage.getItem('directAccessCourse');
  
  if (!token || !tokenCourse || tokenCourse !== courseId) return null;
  
  return token;
}

/**
 * Add a direct access token for a course to local storage
 * @param courseId The course ID
 * @param token The direct access token
 */
export function setDirectAccessToken(courseId: string, token: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('directAccessToken', token);
  localStorage.setItem('directAccessCourse', courseId);
}

/**
 * Clear any stored direct access tokens
 */
export function clearDirectAccessTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('directAccessToken');
  localStorage.removeItem('directAccessCourse');
}

/**
 * Add the direct access token to a fetch request's headers if available
 * @param courseId The course ID
 * @param headers Existing headers object to add the token to
 * @returns Updated headers object with the token added if available
 */
export function addDirectAccessHeader(courseId: string, headers: Record<string, string> = {}): Record<string, string> {
  const token = getDirectAccessToken(courseId);
  
  if (!token) return headers;
  
  return {
    ...headers,
    'X-Direct-Access-Token': token
  };
} 