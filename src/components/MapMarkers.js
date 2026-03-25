import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ── PLACE-MARK SVG BUILDER ──
const makePlaceMarkIcon = (
  fillColor,
  size = 36,
  hovered = false
) => {
  const scale = hovered ? 1.25 : 1
  const px = Math.round(size * scale)

  return L.divIcon({
    className: '',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 3px 6px
          rgba(0,0,0,0.30));
        transform: scale(${scale});
        transform-origin: bottom center;
        transition: transform 0.18s ease;
      ">
        <svg
          width="${px}"
          height="${px}"
          viewBox="0 0 48 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Pin body -->
          <path
            d="M24 2C13.507 2 5 10.507 5 21
               C5 34.5 24 54 24 54
               C24 54 43 34.5 43 21
               C43 10.507 34.493 2 24 2Z"
            fill="${fillColor}"
            stroke="#ffffff"
            stroke-width="2.5"
          />
          <!-- Outer ring -->
          <circle
            cx="24"
            cy="21"
            r="10"
            fill="none"
            stroke="#ffffff"
            stroke-width="2.5"
          />
          <!-- Inner dot -->
          <circle
            cx="24"
            cy="21"
            r="4"
            fill="#ffffff"
          />
        </svg>
      </div>
    `,
    iconSize: [px, px],
    iconAnchor: [px / 2, px],
    popupAnchor: [0, -(px + 4)],
  })
}

// ── PARKING MARKERS — Cyan ──
export const parkingIcon =
  makePlaceMarkIcon('#00C9C8', 36, false)
export const parkingIconHovered =
  makePlaceMarkIcon('#00C9C8', 36, true)

// ── EV CHARGING MARKERS — Orange ──
export const evIcon =
  makePlaceMarkIcon('#FF6B00', 36, false)
export const evIconHovered =
  makePlaceMarkIcon('#FF6B00', 36, true)

// ── USER LOCATION — keep existing pulse dot ──
export const userLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 16px;
      height: 16px;
      background: #00C9C8;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(0,201,200,0.25);
      animation: geoapify-pulse 2s
        ease-in-out infinite;
    "></div>
  `,
  iconAnchor: [8, 8],
})

// ── ICON SELECTOR ──
export const getMarkerIcon = (type, isHovered) => {
  if (type === 'ev') {
    return isHovered ? evIconHovered : evIcon
  }
  return isHovered ? parkingIconHovered : parkingIcon
}
