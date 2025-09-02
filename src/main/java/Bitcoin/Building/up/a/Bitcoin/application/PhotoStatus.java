package Bitcoin.Building.up.a.Bitcoin.application;

/**
 * Status of a photo in the lottery flow.
 */
public enum PhotoStatus {
    IN_DRAW,     // just uploaded; in the current draw
    ACTIVE,      // visible in dashboard/gallery
    DELETED,     // removed by user (apply coin penalty if before draw end)
    DRAW_ENDED   // draw finished for this photo (eligible to re-upload later)
}
