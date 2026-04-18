import React, { useState, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import bookstoresData from './data/bookstores.json';

import {
  Paper,
  Stack,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Popover,
  IconButton,
  TextField,
  Autocomplete,
  Box,
  Button,
  Divider
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';

// ---- Types ----
type TimeRange = {
  open: string;
  close: string;
};

type Store = {
  name: string;
  lat: number;
  lng: number;
  hours: { [key: string]: TimeRange[] };
};

const bookstores = bookstoresData as Store[];

const center: [number, number] = [44.95, -93.27];
const defaultZoom = 11;

// ---- Map helpers ----
function FlyToStore({ store }: { store: Store | null }) {
  const map = useMap();

  useEffect(() => {
    if (store) {
      map.flyTo([store.lat, store.lng], 14, { duration: 1.5 });
    }
  }, [store, map]);

  return null;
}

function ResetViewButton() {
  const map = useMap();

  return (
    <IconButton
      onClick={() => map.flyTo(center, defaultZoom)}
      sx={{
        position: 'absolute',
        top: 72,
        left: 16,
        zIndex: 1200,
        backgroundColor: 'white',
        boxShadow: 2
      }}
    >
      <HomeIcon />
    </IconButton>
  );
}

// ---- Helpers ----
const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m === 0 ? '00' : m} ${period}`;
};

const isStoreOpenInRange = (
  store: Store,
  day: string,
  start: number,
  end: number
): boolean => {
  const ranges = store.hours[day];
  if (!ranges || ranges.length === 0) return false;

  return ranges.some((range) => {
    const open = toMinutes(range.open);
    const close = toMinutes(range.close);
    return open < end && close > start;
  });
};

const isOpenNow = (store: Store): boolean => {
  const now = new Date();
  const today = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];

  const current = now.getHours() * 60 + now.getMinutes();
  const ranges = store.hours[today];

  if (!ranges || ranges.length === 0) return false;

  return ranges.some((range) => {
    const open = toMinutes(range.open);
    const close = toMinutes(range.close);
    return current >= open && current <= close;
  });
};

// ---- Marker component ----
function StoreMarker({
  store,
  style,
  isSelected
}: {
  store: Store;
  style: any;
  isSelected: boolean;
}) {
  const markerRef = useRef<L.CircleMarker | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const todayIndex = new Date().getDay();
  const days = ['sun','mon','tue','wed','thu','fri','sat'];

  const formatRange = (range: TimeRange) => {
    const [h, m] = range.open.split(':').map(Number);
    const [h2, m2] = range.close.split(':').map(Number);

    const to12 = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${m === 0 ? '00' : m} ${period}`;
    };

    return `${to12(h, m)} – ${to12(h2, m2)}`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${store.lat.toFixed(6)}, ${store.lng.toFixed(6)}`
    );

    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <CircleMarker
      ref={markerRef}
      center={[store.lat, store.lng]}
      radius={style.radius}
      pathOptions={{
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity
      }}
    >
      <Popup>
        <Stack spacing={1.2} sx={{ minWidth: 220 }}>

          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {store.name}
          </Typography>

          <Divider />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              rowGap: 0.5,
              columnGap: 1
            }}
          >
            {days.map((d, i) => {
              const ranges = store.hours[d];
              const isToday = i === todayIndex;

              return (
                <React.Fragment key={d}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 600 : 400,
                      opacity: isToday ? 1 : 0.7,
                      textTransform: 'capitalize'
                    }}
                  >
                    {d}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 600 : 400,
                      opacity: isToday ? 1 : 0.7
                    }}
                  >
                    {ranges && ranges.length > 0
                      ? ranges.map(formatRange).join(', ')
                      : 'Closed'}
                  </Typography>
                </React.Fragment>
              );
            })}
          </Box>

          <Divider />

          <Button
            variant="outlined"
            size="small"
            onClick={handleCopy}
            fullWidth
          >
            {copied ? 'Copied!' : 'Copy coordinates'}
          </Button>

          <Typography
            variant="caption"
            sx={{
              textAlign: 'center',
              opacity: 0.6,
              fontFamily: 'monospace'
            }}
          >
            {store.lat.toFixed(5)}, {store.lng.toFixed(5)}
          </Typography>

        </Stack>
      </Popup>
    </CircleMarker>
  );
}

// ---- App ----
function App() {
  const MIN = 7 * 60;
  const MAX = 23 * 60;
  const STEP = 30;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<'all' | 'range' | 'openNow'>('all');
  const [day, setDay] = useState<string>('sat');
  const [range, setRange] = useState<number[]>([720, 900]);

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const open = Boolean(anchorEl);

  const getStyle = (store: Store) => {
    let isMatch = true;

    if (mode === 'openNow') isMatch = isOpenNow(store);
    if (mode === 'range') isMatch = isStoreOpenInRange(store, day, range[0], range[1]);

    if (isMatch) {
      return {
        radius: 8,
        color: '#4b5563',
        fillColor: '#7dd3fc',
        fillOpacity: 1,
        weight: 3
      };
    }

    return {
      radius: 6,
      color: '#6b7280',
      fillColor: '#cbd5f5',
      fillOpacity: 0.5,
      weight: 2
    };
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1200,
          backgroundColor: 'white',
          boxShadow: 2
        }}
      >
        <MenuIcon />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Paper sx={{ p: 2, width: 280 }}>
          <Stack spacing={2}>

            <Autocomplete
              options={bookstores}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => setSelectedStore(value || null)}
              renderInput={(params) => (
                <TextField {...params} label="Find bookstore" size="small" />
              )}
            />

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, val) => val && setMode(val)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="range">Time</ToggleButton>
              <ToggleButton value="openNow">Now</ToggleButton>
            </ToggleButtonGroup>

            {mode === 'range' && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Day</InputLabel>
                  <Select
                    value={day}
                    label="Day"
                    onChange={(e) => setDay(e.target.value)}
                  >
                    <MenuItem value="sun">Sun</MenuItem>
                    <MenuItem value="mon">Mon</MenuItem>
                    <MenuItem value="tue">Tue</MenuItem>
                    <MenuItem value="wed">Wed</MenuItem>
                    <MenuItem value="thu">Thu</MenuItem>
                    <MenuItem value="fri">Fri</MenuItem>
                    <MenuItem value="sat">Sat</MenuItem>
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="caption">
                    {formatTime(range[0])}
                  </Typography>

                  <Slider
                    value={range}
                    onChange={(_, v) => setRange(v as number[])}
                    min={MIN}
                    max={MAX}
                    step={STEP}
                  />

                  <Typography variant="caption" textAlign="right">
                    {formatTime(range[1])}
                  </Typography>
                </Box>
              </>
            )}

          </Stack>
        </Paper>
      </Popover>

      <MapContainer
        center={center}
        zoom={defaultZoom}
        zoomControl={false}
        style={{ height: '100vh', width: '100vw' }}
      >
        <FlyToStore store={selectedStore} />
        <ResetViewButton />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {bookstores.map((store, index) => (
          <StoreMarker
            key={index}
            store={store}
            style={getStyle(store)}
            isSelected={selectedStore?.name === store.name}
          />
        ))}
      </MapContainer>
    </>
  );
}

export default App;