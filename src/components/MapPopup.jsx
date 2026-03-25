import { useNavigate } from 'react-router-dom'

export default function MapPopup({
  location,
  userCoords,
  distanceKm,
}) {
  const navigate = useNavigate()

  const isEV = location.type === 'ev_charging'
  const accentColor = isEV ? '#FF6B00' : '#00C9C8'

  return (
    <div style={{
      padding: '14px',
      width: '220px',
      fontFamily: 'inherit',
    }}>

      {/* Top row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: '9999px',
          background: isEV
            ? 'rgba(255,107,0,0.15)'
            : 'rgba(0,201,200,0.15)',
          color: accentColor,
          letterSpacing: '0.05em',
        }}>
          {isEV ? 'EV CHARGING' : 'PARKING'}
        </span>
        {location.price_per_hour && (
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#0f172a',
          }}>
            Rs.{location.price_per_hour}
            <span style={{
              fontSize: '10px',
              color: '#64748b',
              fontWeight: 400,
            }}>
              /hr
            </span>
          </span>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontSize: '13px',
        fontWeight: 700,
        color: '#0f172a',
        marginBottom: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}>
        {location.name}
      </div>

      {/* Address */}
      <div style={{
        fontSize: '11px',
        color: '#64748b',
        marginBottom: '10px',
      }}>
        {location.address}
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        marginBottom: '10px',
      }} />

      {/* Distance */}
      {distanceKm && (
        <div style={{
          fontSize: '11px',
          color: accentColor,
          marginBottom: '6px',
          fontWeight: 600,
        }}>
          {distanceKm} km away
        </div>
      )}

      {/* Slots */}
      <div style={{
        fontSize: '11px',
        color: '#64748b',
        marginBottom: '12px',
      }}>
        {isEV
          ? `${location.available_slots ?? 0} slots available`
          : `${location.car_available_slots ?? 0} car · ${location.bike_available_slots ?? 0} bike`
        }
      </div>

      {/* CTA */}
      <button
        onClick={() =>
          navigate(`/locations/${location.id}`)
        }
        style={{
          width: '100%',
          background: accentColor,
          color: '#0D1117',
          border: 'none',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          padding: '8px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.05em',
        }}
      >
        VIEW DETAILS
      </button>

    </div>
  )
}
