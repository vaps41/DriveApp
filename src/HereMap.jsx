import React, { useEffect, useRef, useState } from 'react';

export default function HereMap({ apikey, startCoord, endCoord, isSimulating, onSimulationDone, onRouteCalculated }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const platformRef = useRef(null);
  
  const objectsRef = useRef({ startMarker: null, endMarker: null, routeLine: null });
  const animTimer = useRef(null);

  // 📍 DEEP DEBUG 1: Guardar a função atualizada numa referência para evitar "Stale Closures"
  const callbackRef = useRef(onSimulationDone);
  useEffect(() => { callbackRef.current = onSimulationDone; }, [onSimulationDone]);

  // 📍 DEEP DEBUG 2: Trava de segurança. A simulação só arranca quando a rota existir.
  const [routeReady, setRouteReady] = useState(false);

  // Inicialização Única do Mapa
  useEffect(() => {
    if (!window.H || !mapContainer.current || mapInstance.current) return;

    const platform = new window.H.service.Platform({ apikey });
    platformRef.current = platform;
    const defaultLayers = platform.createDefaultLayers();

    const map = new window.H.Map(
      mapContainer.current,
      defaultLayers.vector.normal.map,
      { zoom: 14, center: startCoord, pixelRatio: window.devicePixelRatio || 1 }
    );

    window.addEventListener('resize', () => map.getViewPort().resize());
    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    window.H.ui.UI.createDefault(map, defaultLayers);
    
    mapInstance.current = map;

    return () => {
      map.dispose();
      mapInstance.current = null;
    };
  }, [apikey]);

  // Extrair valores primitivos para o React não re-renderizar em falso
  const startLat = startCoord?.lat;
  const startLng = startCoord?.lng;
  const endLat = endCoord?.lat;
  const endLng = endCoord?.lng;

  // Traçar a Rota e os Pinos
  useEffect(() => {
    if (!mapInstance.current || !startLat || !startLng || !endLat || !endLng) return;
    
    const map = mapInstance.current;
    const platform = platformRef.current;
    const obs = objectsRef.current;

    setRouteReady(false); // Bloqueia a animação até a nova rota estar calculada

    // 📍 DEEP DEBUG 3: Limpeza 100% segura com Try-Catch
    // Evita que o mapa "crashe" e bloqueie a segunda viagem
    try {
      const objectsToRemove = [];
      if (obs.routeLine) objectsToRemove.push(obs.routeLine);
      if (obs.startMarker) objectsToRemove.push(obs.startMarker);
      if (obs.endMarker) objectsToRemove.push(obs.endMarker);
      
      if (objectsToRemove.length > 0) {
        map.removeObjects(objectsToRemove);
      }
    } catch (e) {
      console.warn("Aviso ignorado ao limpar objetos antigos do mapa:", e);
    }

    // Cria os Novos Pinos Fixos
    obs.startMarker = new window.H.map.Marker({ lat: startLat, lng: startLng });
    obs.endMarker = new window.H.map.Marker({ lat: endLat, lng: endLng });
    map.addObjects([obs.startMarker, obs.endMarker]);

    const router = platform.getRoutingService(null, 8);
    router.calculateRoute({
      routingMode: 'fast', transportMode: 'car',
      origin: `${startLat},${startLng}`,
      destination: `${endLat},${endLng}`,
      return: 'polyline,summary'
    }, (result) => {
      if (result.routes.length > 0) {
        const route = result.routes[0];
        const linestring = window.H.geo.LineString.fromFlexiblePolyline(route.sections[0].polyline);
        
        const routeLine = new window.H.map.Polyline(linestring, {
          style: { lineWidth: 5, strokeColor: '#2563eb' }
        });

        map.addObject(routeLine);
        obs.routeLine = routeLine;
        
        map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() }, true);

        if (onRouteCalculated) {
          onRouteCalculated({ 
            distanceKm: (route.sections[0].summary.length / 1000).toFixed(1), 
            timeMin: Math.ceil(route.sections[0].summary.duration / 60) 
          });
        }
        
        // 📍 Rota calculada com sucesso. Simulação desbloqueada!
        setRouteReady(true);
      } else {
        // 📍 SISTEMA SALVA-VIDAS: Se o GPS falhar a traçar a rota (ex: zona sem estradas)
        console.error("Nenhuma rota encontrada para estes pontos.");
        if (callbackRef.current) callbackRef.current(); // Avança viagem automaticamente
      }
    }, (error) => {
      // 📍 SISTEMA SALVA-VIDAS 2: Se a API falhar
      console.error("Erro na API da HERE Maps:", error);
      if (callbackRef.current) callbackRef.current(); // Avança viagem automaticamente
    });
  }, [startLat, startLng, endLat, endLng]);

  // Motor da Simulação (Otimizado)
  useEffect(() => {
    // 📍 O GPS virtual só arranca se isSimulating=true E a rota estiver pronta
    if (!isSimulating || !routeReady || !objectsRef.current.routeLine || !mapInstance.current) {
        clearTimeout(animTimer.current);
        return;
    }

    const lineString = objectsRef.current.routeLine.getGeometry();
    const pointsCount = lineString.getPointCount();
    let currentPoint = 0;

    const animateCar = () => {
      if (currentPoint < pointsCount) {
        const point = lineString.extractPoint(currentPoint);
        
        if (objectsRef.current.startMarker) {
            objectsRef.current.startMarker.setGeometry(point);
        }
        
        if (currentPoint % 4 === 0) {
          mapInstance.current.setCenter(point, true);
        }
        
        currentPoint++;
        animTimer.current = setTimeout(animateCar, 40);
      } else {
        // Dispara a função de finalização perfeitamente sincronizada
        if (callbackRef.current) callbackRef.current();
      }
    };

    animateCar(); 
    
    return () => clearTimeout(animTimer.current);
  }, [isSimulating, routeReady]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}
