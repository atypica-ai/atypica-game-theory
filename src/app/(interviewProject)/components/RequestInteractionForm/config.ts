/**
 * Multiple choice question UI style configuration
 *
 * Style A: Vertical layout
 * - Layout: 1 column (vertical, one option per row)
 * - Selected style: Black background + white text + checkmark
 * - Consistent with single-choice questions
 *
 * Style B: 2-column layout
 * - Layout: 2 columns (grid)
 * - Selected style: Black background + white text + checkmark
 * - Matches original prototype design
 *
 * Note: Both styles now use the same selection appearance (black background),
 * they only differ in layout (1 column vs 2 columns)
 */
export const MULTIPLE_CHOICE_STYLE: "A" | "B" = "A";

/**
 * Required field IDs for basic info form
 * name, gender, location, ageRange are required; occupation is optional
 */
export const REQUIRED_FIELD_IDS = new Set(["name", "gender", "location", "ageRange"]);

/**
 * Single choice field IDs for basic info form (gender, ageRange)
 * Other choice fields in basic info form are multi-choice
 */
export const SINGLE_CHOICE_FIELD_IDS = new Set(["gender", "ageRange"]);
