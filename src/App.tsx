import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import bookstoresData from "./data/bookstores.json";

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
  IconButton,
  TextField,
  Autocomplete,
  Box,
  Button,
  Divider,
  Tooltip,
} from "@mui/material";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import CloseIcon from "@mui/icons-material/Close";

// ---- Constants ----
const MIN = 7 * 60;
const MAX = 23 * 60;
const STEP = 30;
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const DAY_LABELS: { [key: string]: string } = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

// ---- Types ----
type TimeRange = {
  open: string;
  close: string;
  note?: string;
};

type Store = {
  name: string;
  lat: number;
  lng: number;
  note?: string;
  hours: { [key: string]: TimeRange[] };
};

type MarkerStyle = {
  radius: number;
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
};

const bookstores = bookstoresData as Store[];

const bounds = L.latLngBounds(
  bookstores.map((s) => [s.lat, s.lng] as [number, number]),
);

// ---- Map helpers ----
function FlyToStore({ store }: { store: Store | null; onFlown: () => void }) {
  const map = useMap();

  useEffect(() => {
    if (store) {
      const zoom = 14;
      const targetLatLng = L.latLng(store.lat, store.lng);
      const point = map.project(targetLatLng, zoom);
      const offsetPoint = point.subtract([0, 150]);
      const offsetLatLng = map.unproject(offsetPoint, zoom);
      map.flyTo(offsetLatLng, zoom, { duration: 1.5 });
    }
  }, [store, map]);

  return null;
}

function MapController({
  flyHomeRef,
}: {
  flyHomeRef: React.MutableRefObject<(() => void) | null>;
}) {
  const map = useMap();
  flyHomeRef.current = () =>
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });
  return null;
}

// ---- Helpers ----
const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m === 0 ? "00" : m} ${period}`;
};

const formatRange = (range: TimeRange): string => {
  return `${formatTime(toMinutes(range.open))} - ${formatTime(toMinutes(range.close))}`;
};

const isStoreOpenInRange = (
  store: Store,
  day: string,
  start: number,
  end: number,
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
  const today = DAYS[now.getDay()];
  const current = now.getHours() * 60 + now.getMinutes();
  const ranges = store.hours[today];

  if (!ranges || ranges.length === 0) return false;

  return ranges.some((range) => {
    const open = toMinutes(range.open);
    const close = toMinutes(range.close);
    return current >= open && current < close;
  });
};

const hasExtendedHours = (ranges: TimeRange[]): boolean =>
  ranges.some((r) => r.note === "independent_bookstore_week_extended");

// ---- Marker component ----
function StoreMarker({
  store,
  style,
  isSelected,
}: {
  store: Store;
  style: MarkerStyle;
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${store.lat.toFixed(6)}, ${store.lng.toFixed(6)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const anyExtended = DAYS.some((d) => {
    const ranges = store.hours[d];
    return ranges && hasExtendedHours(ranges);
  });

  return (
    <CircleMarker
      ref={markerRef}
      center={[store.lat, store.lng]}
      radius={style.radius}
      pathOptions={{
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
      }}
    >
      <Popup>
        <Stack spacing={1.2} sx={{ minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {store.name}
          </Typography>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "72px 1fr",
              rowGap: 0.5,
              columnGap: 1,
            }}
          >
            {DAYS.map((d, i) => {
              const ranges = store.hours[d];
              const isToday = i === todayIndex;
              const extended = ranges && hasExtendedHours(ranges);

              return (
                <React.Fragment key={d}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 600 : 400,
                      opacity: isToday ? 1 : 0.7,
                    }}
                  >
                    {DAY_LABELS[d]}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isToday ? 600 : 400,
                      opacity: isToday ? 1 : 0.7,
                    }}
                  >
                    {ranges && ranges.length > 0
                      ? ranges.map(formatRange).join(", ")
                      : "Closed"}
                    {extended && (
                      <Box component="span" sx={{ fontWeight: 700, ml: 0.25 }}>
                        *
                      </Box>
                    )}
                  </Typography>
                </React.Fragment>
              );
            })}
          </Box>

          {anyExtended && (
            <>
              <Divider />
              <Typography
                variant="caption"
                sx={{ opacity: 0.7, fontStyle: "italic" }}
              >
                * Extended hours for Indie Bookstore Week
              </Typography>
            </>
          )}

          <Divider />

          <Button
            variant="outlined"
            size="small"
            onClick={handleCopy}
            fullWidth
          >
            {copied ? "Copied!" : "Copy coordinates"}
          </Button>

          <Typography
            variant="caption"
            sx={{
              textAlign: "center",
              opacity: 0.6,
              fontFamily: "monospace",
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "range" | "openNow">("all");
  const [day, setDay] = useState<string>("sat");
  const [range, setRange] = useState<number[]>([720, 900]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const flyHomeRef = useRef<(() => void) | null>(null);

  // Refs used to detect clicks outside the panels
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Kill the page scrollbar so the map always fills the viewport
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.margin = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
    };
  }, []);

  // Close panels on mousedown outside — doesn't block wheel/scroll events
  // unlike a backdrop div would.
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // If the click is inside the toolbar, let the toolbar button handle it
      if (toolbarRef.current?.contains(target)) return;

      if (filtersOpen && !filtersRef.current?.contains(target)) {
        setFiltersOpen(false);
      }
      if (infoOpen && !infoRef.current?.contains(target)) {
        setInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [filtersOpen, infoOpen]);

  const getStyle = (store: Store): MarkerStyle => {
    let isMatch = true;

    if (mode === "openNow") isMatch = isOpenNow(store);
    if (mode === "range")
      isMatch = isStoreOpenInRange(store, day, range[0], range[1]);

    if (isMatch) {
      return {
        radius: 8,
        color: "#4b5563",
        fillColor: "#7dd3fc",
        fillOpacity: 1,
        weight: 3,
      };
    }

    return {
      radius: 6,
      color: "#4b5563",
      fillColor: "#cbd5f5",
      fillOpacity: 0.72,
      weight: 2,
    };
  };

  return (
    <>
      {/* ---- Toolbar (top-right) ---- */}
      <Box
        ref={toolbarRef}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1200,
          display: "flex",
          gap: 1,
        }}
      >
        <Tooltip title="Bookstores">
          <IconButton
            onClick={() => {
              setFiltersOpen((v) => !v);
              setInfoOpen(false);
            }}
            sx={{ backgroundColor: "white", boxShadow: 2 }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reset map view">
          <IconButton
            onClick={() => flyHomeRef.current?.()}
            sx={{ backgroundColor: "white", boxShadow: 2 }}
          >
            <ZoomOutMapIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="About">
          <IconButton
            onClick={() => {
              setInfoOpen((v) => !v);
              setFiltersOpen(false);
            }}
            sx={{ backgroundColor: "white", boxShadow: 2 }}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ---- Filters panel ---- */}
      {filtersOpen && (
        <Box
          ref={filtersRef}
          sx={{
            position: "absolute",
            top: 72,
            right: 16,
            zIndex: 1200,
            width: 280,
            pointerEvents: "auto",
          }}
        >
          <Paper sx={{ p: 2 }} elevation={3}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Find a bookstore
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setFiltersOpen(false)}
                  sx={{ mr: -0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <Autocomplete
                options={bookstores}
                getOptionLabel={(option) => option.name}
                onChange={(_, value) => {
                  setSelectedStore(value || null);
                  if (value) setFiltersOpen(false);
                }}
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

              {mode === "range" && (
                <>
                  <FormControl fullWidth size="small">
                    <InputLabel>Day</InputLabel>
                    <Select
                      value={day}
                      label="Day"
                      onChange={(e) => setDay(e.target.value)}
                    >
                      <MenuItem value="sun">Sunday</MenuItem>
                      <MenuItem value="mon">Monday</MenuItem>
                      <MenuItem value="tue">Tuesday</MenuItem>
                      <MenuItem value="wed">Wednesday</MenuItem>
                      <MenuItem value="thu">Thursday</MenuItem>
                      <MenuItem value="fri">Friday</MenuItem>
                      <MenuItem value="sat">Saturday</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ px: 1, pt: 3 }}>
                    <Slider
                      value={range}
                      onChange={(_, v) => setRange(v as number[])}
                      min={MIN}
                      max={MAX}
                      step={STEP}
                      valueLabelDisplay="on"
                      valueLabelFormat={formatTime}
                      sx={{
                        "& .MuiSlider-valueLabel": {
                          fontSize: 11,
                          padding: "2px 6px",
                        },
                      }}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* ---- Info panel ---- */}
      {infoOpen && (
        <Box
          ref={infoRef}
          sx={{
            position: "absolute",
            top: 72,
            right: 16,
            zIndex: 1200,
            width: 260,
            pointerEvents: "auto",
          }}
        >
          <Paper sx={{ p: 2 }} elevation={3}>
            <Stack spacing={1}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Independent Bookstore Week
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setInfoOpen(false)}
                  sx={{ mr: -0.5 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Use this app to find participating bookstores.
              </Typography>
              <Divider />
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#86BBBD",
                    border: "2px solid #4b5563",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption">
                  Matches current filter
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#cbd5f5",
                    border: "2px solid #4b5563",
                    opacity: 0.72,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption">Does not match</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      )}

      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [10, 10] }}
        zoomControl={false}
        style={{ height: "100vh", width: "100%", overflow: "hidden" }}
      >
        <FlyToStore store={selectedStore} onFlown={() => {}} />
        <MapController flyHomeRef={flyHomeRef} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {bookstores.map((store) => (
          <StoreMarker
            key={store.name}
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
