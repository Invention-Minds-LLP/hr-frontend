import { Component } from '@angular/core';
import { GeoTracking } from '../../services/geo-tracking/geo-tracking';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { FileUrlPipe } from '../../pipes/file-url.pipe';


@Component({
  selector: 'app-my-emp-locations',
  imports: [CommonModule, TableModule, DialogModule, ButtonModule, DatePickerModule, FormsModule, ReactiveFormsModule, FileUrlPipe],
  templateUrl: './my-emp-locations.html',
  styleUrl: './my-emp-locations.css',
})
export class MyEmpLocations {
  teamSessions: any[] = [];

  showEmployeePopup = false;
  showSessionPopup = false;

  selectedEmployee: any;
  selectedSessionDate: Date = new Date();

  filteredSessions: any[] = [];

  map: any;

  mapStats: null | {
  distanceKm: string;
  durationMin: number;
  startTime?: string;
  endTime?: string;
} = null;



  photos: any[] = [];
  routePoints: any[] = [];
  showPhotoPopup: boolean = false;
  showRoutePopup: boolean = false;




  constructor(private geoService: GeoTracking) { }

  ngOnInit() {
    this.loadTeamSessions()
  }



  openEmployeeDetails(emp: any) {
    this.selectedEmployee = emp;
    this.showEmployeePopup = true;
    // default to today
    this.selectedSessionDate = new Date();
    this.filterSessionsByDate();
  }

  loadTeamSessions() {
    this.geoService.getManagerSessions()
      .subscribe(data => this.teamSessions = data);
  }

  openPhotoPopup(photos: any[]) {
    this.photos = photos;
    this.showPhotoPopup = true;
  }

  closeSessionPopup() {
    this.showSessionPopup = false;

    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
  }


  openRoute(points: any[]) {
    this.routePoints = points;
    this.showRoutePopup = true;
  }

  closeRoutePopup() {
    this.showRoutePopup = false;
    this.routePoints = [];
  }

  filterSessionsByDate() {
    if (!this.selectedEmployee) return;

    const selected = new Date(this.selectedSessionDate);
    selected.setHours(0, 0, 0, 0);

    this.filteredSessions =
      this.selectedEmployee.locationSessions.filter((s: any) => {
        const d = new Date(s.createdAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === selected.getTime();
      });
  }
openSessionDetails(session: any) {
  this.photos = session.photos || [];
  // Your API returns points inside `locations`
  this.routePoints = session.locations || session.locationPoints || [];

  this.mapStats = this.computeStats(this.routePoints);

  this.showSessionPopup = true;

  setTimeout(() => this.initMap(), 200);
}


  // initMap() {
  //   if (!this.routePoints.length) return;

  //   // destroy old map
  //   if (this.map) {
  //     this.map.off();
  //     this.map.remove();
  //     this.map = null;
  //   }

  //   const first = this.routePoints[0];

  //   this.map = L.map('routeMap').setView(
  //     [first.latitude, first.longitude],
  //     15
  //   );

  //   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  //     attribution: '© OpenStreetMap'
  //   }).addTo(this.map);

  //   const latlngs: L.LatLngTuple[] = this.routePoints.map((p: any) => [
  //     Number(p.latitude),
  //     Number(p.longitude)
  //   ]);

  //   // -------- DISTANCE + DURATION --------
  //   const startTime = new Date(this.routePoints[0].recordedAt);
  //   const endTime = new Date(
  //     this.routePoints[this.routePoints.length - 1].recordedAt
  //   );

  //   const durationMs = endTime.getTime() - startTime.getTime();
  //   const durationMin = Math.round(durationMs / 60000);

  //   let totalDistance = 0;
  //   for (let i = 1; i < latlngs.length; i++) {
  //     totalDistance += this.map.distance(latlngs[i - 1], latlngs[i]);
  //   }

  //   const distanceKm = (totalDistance / 1000).toFixed(2);

  //   // display stats
  //   const stats = new L.Control({ position: 'topright' });

  //   stats.onAdd = () => {
  //     const div = L.DomUtil.create('div', 'map-stats');
  //     div.innerHTML = `
  //   <strong>Distance:</strong> ${distanceKm} km<br>
  //   <strong>Duration:</strong> ${durationMin} min
  // `;
  //     return div;
  //   };

  //   stats.addTo(this.map);


  //   // -------- SPEED BASED ROUTE COLOR --------
  //   for (let i = 1; i < this.routePoints.length; i++) {
  //     const p1 = this.routePoints[i - 1];
  //     const p2 = this.routePoints[i];

  //     const segment = [
  //       [p1.latitude, p1.longitude],
  //       [p2.latitude, p2.longitude]
  //     ] as L.LatLngTuple[];

  //     const speed = p2.speed || 0;

  //     let color = '#2b7cff'; // normal
  //     if (speed < 0.3) color = '#ff9800'; // slow
  //     if (speed < 0.05) color = '#f44336'; // stopped

  //     L.polyline(segment, {
  //       color,
  //       weight: 4,
  //       opacity: 0.9
  //     }).addTo(this.map);
  //   }

  //   // -------- START & END MARKERS --------
  //   const startTimeText = startTime.toLocaleTimeString();
  //   const endTimeText = endTime.toLocaleTimeString();

  //   L.circleMarker(latlngs[0], {
  //     radius: 8,
  //     color: '#00c853',
  //     fillColor: '#00e676',
  //     fillOpacity: 1
  //   })
  //     .addTo(this.map)
  //     .bindPopup(`Start: ${startTimeText}`);

  //   L.circleMarker(latlngs[latlngs.length - 1], {
  //     radius: 8,
  //     color: '#d50000',
  //     fillColor: '#ff1744',
  //     fillOpacity: 1
  //   })
  //     .addTo(this.map)
  //     .bindPopup(`End: ${endTimeText}`);

  //   // fit map
  //   const bounds = L.latLngBounds(latlngs);
  //   this.map.fitBounds(bounds);

  //   // -------- PLAYBACK ANIMATION --------
  //   // this.animateRoute(latlngs);
  // }
  initMap() {
  if (!this.routePoints.length) return;

  // destroy old map
  if (this.map) {
    this.map.off();
    this.map.remove();
    this.map = null;
  }

  const first = this.routePoints[0];

  this.map = L.map('routeMap').setView(
    [first.latitude, first.longitude],
    15
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(this.map);

  // -------- CLEAN POINTS (REMOVE GPS NOISE) --------
  const cleanPoints: any[] = [];

  for (let i = 0; i < this.routePoints.length; i++) {
    const p = this.routePoints[i];

    // skip bad accuracy
    if (p.accuracy && p.accuracy > 20) continue;

    if (cleanPoints.length === 0) {
      cleanPoints.push(p);
      continue;
    }

    const last = cleanPoints[cleanPoints.length - 1];

    const dist = this.map.distance(
      [last.latitude, last.longitude],
      [p.latitude, p.longitude]
    );

    // skip tiny movement (<5m)
    if (dist < 5) continue;

    // skip unrealistic jumps (>200m)
    if (dist > 200) continue;

    cleanPoints.push(p);
  }

  if (cleanPoints.length < 2) return;

  // convert to latlngs
  const latlngs: L.LatLngTuple[] = cleanPoints.map((p: any) => [
    Number(p.latitude),
    Number(p.longitude)
  ]);

  // -------- DISTANCE + DURATION --------
  const startTime = new Date(cleanPoints[0].recordedAt);
  const endTime = new Date(
    cleanPoints[cleanPoints.length - 1].recordedAt
  );

  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMin = Math.round(durationMs / 60000);

  let totalDistance = 0;
  for (let i = 1; i < latlngs.length; i++) {
    totalDistance += this.map.distance(latlngs[i - 1], latlngs[i]);
  }

  const distanceKm = (totalDistance / 1000).toFixed(2);

  // -------- MAP STATS CONTROL --------
  const stats = new L.Control({ position: 'topright' });

  stats.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-stats');
    div.innerHTML = `
      <strong>Distance:</strong> ${distanceKm} km<br>
      <strong>Duration:</strong> ${durationMin} min
    `;
    return div;
  };

  stats.addTo(this.map);

  // -------- SPEED BASED ROUTE COLOR --------
  for (let i = 1; i < cleanPoints.length; i++) {
    const p1 = cleanPoints[i - 1];
    const p2 = cleanPoints[i];

    const segment: L.LatLngTuple[] = [
      [p1.latitude, p1.longitude],
      [p2.latitude, p2.longitude]
    ];

    const speed = p2.speed || 0;

    let color = '#2b7cff'; // normal
    if (speed < 0.3) color = '#ff9800'; // slow
    if (speed < 0.05) color = '#f44336'; // stopped

    L.polyline(segment, {
      color,
      weight: 4,
      opacity: 0.9
    }).addTo(this.map);
  }

  // -------- START & END MARKERS --------
  const startTimeText = startTime.toLocaleTimeString();
  const endTimeText = endTime.toLocaleTimeString();

  L.circleMarker(latlngs[0], {
    radius: 8,
    color: '#00c853',
    fillColor: '#00e676',
    fillOpacity: 1
  })
    .addTo(this.map)
    .bindPopup(`Start: ${startTimeText}`);

  L.circleMarker(latlngs[latlngs.length - 1], {
    radius: 8,
    color: '#d50000',
    fillColor: '#ff1744',
    fillOpacity: 1
  })
    .addTo(this.map)
    .bindPopup(`End: ${endTimeText}`);

  // fit map to route
  const bounds = L.latLngBounds(latlngs);
  this.map.fitBounds(bounds);
}

  // animateRoute(latlngs: L.LatLngTuple[]) {
  //   let index = 0;

  //   const marker = L.circleMarker(latlngs[0], {
  //     radius: 6,
  //     color: '#000',
  //     fillColor: '#00bcd4',
  //     fillOpacity: 1
  //   }).addTo(this.map);

  //   const interval = setInterval(() => {
  //     index++;

  //     if (index >= latlngs.length) {
  //       clearInterval(interval);
  //       return;
  //     }

  //     marker.setLatLng(latlngs[index]);
  //   }, 300); // speed of playback
  // }



private computeStats(points: any[]) {
  if (!points?.length) return null;

  const filtered: any[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    // 1. skip bad accuracy
    if (p.accuracy && p.accuracy > 20) continue;

    if (filtered.length === 0) {
      filtered.push(p);
      continue;
    }

    const last = filtered[filtered.length - 1];

    const dist = this.haversineMeters(
      Number(last.latitude),
      Number(last.longitude),
      Number(p.latitude),
      Number(p.longitude)
    );

    // 2. skip very small movement (<5m)
    if (dist < 5) continue;

    // 3. skip unrealistic jumps (>200m in one step)
    if (dist > 200) continue;

    filtered.push(p);
  }

  // calculate distance
  let meters = 0;
  for (let i = 1; i < filtered.length; i++) {
    meters += this.haversineMeters(
      Number(filtered[i - 1].latitude),
      Number(filtered[i - 1].longitude),
      Number(filtered[i].latitude),
      Number(filtered[i].longitude)
    );
  }

  const firstT = new Date(filtered[0].recordedAt).getTime();
  const lastT = new Date(filtered[filtered.length - 1].recordedAt).getTime();
  const durationMin = Math.max(0, Math.round((lastT - firstT) / 60000));

  const distanceKm = (meters / 1000).toFixed(2);

  const startTime = new Date(filtered[0].recordedAt)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const endTime = new Date(filtered[filtered.length - 1].recordedAt)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return { distanceKm, durationMin, startTime, endTime };
}


private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
onMapDialogShow() {
  setTimeout(() => {
    if (this.map) this.map.invalidateSize();
  }, 200);
}

}
