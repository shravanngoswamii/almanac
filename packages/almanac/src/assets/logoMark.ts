/**
 * The Almanac mark: an "A" with an accent arc sweeping over its apex and an
 * amber dot at the arc's end, for the celestial tables an almanac was named
 * after. The arc and dot carry over the visual language of the earlier mark.
 */
export const logoMark = {
	viewBox: "0 0 128 128",
	strokeWidth: 13,
	arcStrokeWidth: 12,
	leftLeg: "M32 106 L64 36",
	rightLeg: "M64 36 L96 106",
	crossbar: "M46 80 L82 80",
	arc: "M40 26 Q64 6 88 26",
	dot: { cx: 88, cy: 26, r: 7 },
} as const;
