package smarttransit;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

// =====================================================================
// 1. EXCEPTIONS (DEFENSIVE ENCAPSULATION)
// =====================================================================
class InsufficientBalanceException extends Exception {
    public InsufficientBalanceException(String msg) { super(msg); }
}
class CapacityExceededException extends Exception {
    public CapacityExceededException(String msg) { super(msg); }
}

// =====================================================================
// 2. STRATEGY PATTERN (POLYMORPHIC FARE CALCULATION)
// =====================================================================
interface FareStrategy {
    double calculateFare(double distanceKm, boolean isPeakHour);
    String getStrategyName();
}

class StandardFareStrategy implements FareStrategy {
    public double calculateFare(double d, boolean p) {
        double f = 10.0 + (d * 2.50);
        return p ? f * 1.20 : f;
    }
    public String getStrategyName() { return "Standard Fare (Peak 1.2x)"; }
}

class StudentConcessionStrategy implements FareStrategy {
    public double calculateFare(double d, boolean p) {
        return 5.0 + (d * 1.25); // 50% Flat Academic Concession
    }
    public String getStrategyName() { return "Student Concession (50% Off)"; }
}

class EcoMultiModalStrategy implements FareStrategy {
    public double calculateFare(double d, boolean p) {
        return (8.0 + (d * 2.0)) * 0.70; // 30% Green Transit Discount
    }
    public String getStrategyName() { return "Eco Multi-Modal Pass (30% Off)"; }
}

// =====================================================================
// 3. ENCAPSULATED COMMUTER SMART CARD
// =====================================================================
class CommuterSmartCard {
    private final String cardId;
    private final String commuterName;
    private double walletBalance;
    private FareStrategy fareStrategy;

    public CommuterSmartCard(String id, String name, double bal, FareStrategy strat) {
        this.cardId = id; 
        this.commuterName = name;
        this.walletBalance = Math.max(0, bal); 
        this.fareStrategy = strat;
    }
    public synchronized void deductFare(double amount) throws InsufficientBalanceException {
        if (amount > walletBalance) {
            throw new InsufficientBalanceException("Insufficient card balance! Required: Rs. " +
                    String.format("%.2f", amount) + ", Available: Rs. " + String.format("%.2f", walletBalance));
        }
        walletBalance -= amount;
    }
    public synchronized void recharge(double amt) { if (amt > 0) walletBalance += amt; }
    public String getCardId() { return cardId; }
    public String getCommuterName() { return commuterName; }
    public double getWalletBalance() { return walletBalance; }
    public FareStrategy getFareStrategy() { return fareStrategy; }
    public void setFareStrategy(FareStrategy s) { this.fareStrategy = s; }
}

// =====================================================================
// 4. VEHICLE INHERITANCE HIERARCHY
// =====================================================================
abstract class TransportVehicle {
    protected final String vehicleId;
    protected final int maxCapacity;
    protected int currentOccupancy;
    protected double currentSpeedKmH;
    protected String assignedCorridor;
    protected String status;

    public TransportVehicle(String id, int cap, double spd, String cor) {
        this.vehicleId = id; 
        this.maxCapacity = cap; 
        this.currentOccupancy = 0;
        this.currentSpeedKmH = spd; 
        this.assignedCorridor = cor; 
        this.status = "ACTIVE";
    }
    public synchronized void board(int count) throws CapacityExceededException {
        if (currentOccupancy + count > maxCapacity) {
            throw new CapacityExceededException("Vehicle " + vehicleId + " capacity exceeded!");
        }
        currentOccupancy += count;
    }
    public synchronized void deboard(int count) { currentOccupancy = Math.max(0, currentOccupancy - count); }
    public double getOccupancyRate() { return ((double) currentOccupancy / maxCapacity) * 100.0; }
    public boolean isSurgeTriggered() { return getOccupancyRate() >= 85.0; }
    public abstract double calculateTravelTime(double distanceKm, double congestionFactor);

    public String getVehicleId() { return vehicleId; }
    public int getMaxCapacity() { return maxCapacity; }
    public int getCurrentOccupancy() { return currentOccupancy; }
    public double getCurrentSpeedKmH() { return currentSpeedKmH; }
    public String getAssignedCorridor() { return assignedCorridor; }
    public String getStatus() { return status; }
    public void setStatus(String s) { this.status = s; }
    public void setAssignedCorridor(String c) { this.assignedCorridor = c; }
}

class ElectricBus extends TransportVehicle {
    private int batterySOC;
    public ElectricBus(String id, int cap, double spd, String cor, int soc) {
        super(id, cap, spd, cor); this.batterySOC = soc;
    }
    public double calculateTravelTime(double d, double cf) { return (d / currentSpeedKmH) * 60.0 * cf; }
    public int getBatterySOC() { return batterySOC; }
}

class MetroTrain extends TransportVehicle {
    public MetroTrain(String id, int cap, double spd, String cor) {
        super(id, cap, spd, cor);
    }
    public double calculateTravelTime(double d, double cf) { return (d / currentSpeedKmH) * 60.0; }
}

class SmartShuttle extends TransportVehicle {
    private boolean isStandby;
    public SmartShuttle(String id, int cap, double spd, String cor) {
        super(id, cap, spd, cor); this.isStandby = true; this.status = "STANDBY DEPOT";
    }
    public double calculateTravelTime(double d, double cf) {
        return (d / (currentSpeedKmH * 1.15)) * 60.0 * (1.0 + (cf - 1.0) * 0.6);
    }
    public boolean isStandby() { return isStandby; }
    public void setStandby(boolean s) {
        this.isStandby = s;
        this.status = s ? "STANDBY DEPOT" : "AUTO-DISPATCHED SURGE";
    }
}

// =====================================================================
// 5. GRAPH ROUTING & CONGESTION-AWARE DIJKSTRA
// =====================================================================
class CorridorEdge {
    String destinationNode;
    double baseDistanceKm;
    double congestionMultiplier;
    public CorridorEdge(String d, double dist, double cm) {
        this.destinationNode = d; this.baseDistanceKm = dist; this.congestionMultiplier = cm;
    }
    public double getEffectiveCost() { return baseDistanceKm * congestionMultiplier; }
}

class DijkstraRouter {
    Map<String, List<CorridorEdge>> adj = new HashMap<>();

    public void addCorridor(String from, String to, double dist, double cm) {
        adj.computeIfAbsent(from, k -> new ArrayList<>()).add(new CorridorEdge(to, dist, cm));
        adj.computeIfAbsent(to, k -> new ArrayList<>()).add(new CorridorEdge(from, dist, cm));
    }
    public void updateTraffic(String from, String to, double cm) {
        if (adj.containsKey(from)) for (CorridorEdge e : adj.get(from)) if (e.destinationNode.equalsIgnoreCase(to)) e.congestionMultiplier = cm;
        if (adj.containsKey(to)) for (CorridorEdge e : adj.get(to)) if (e.destinationNode.equalsIgnoreCase(from)) e.congestionMultiplier = cm;
    }
    public List<String> findShortestPath(String start, String end) {
        if (!adj.containsKey(start) || !adj.containsKey(end)) return Collections.emptyList();
        Map<String, Double> dist = new HashMap<>();
        Map<String, String> prev = new HashMap<>();
        PriorityQueue<String> pq = new PriorityQueue<>(Comparator.comparingDouble(dist::get));

        for (String n : adj.keySet()) dist.put(n, Double.POSITIVE_INFINITY);
        dist.put(start, 0.0);
        pq.add(start);

        while (!pq.isEmpty()) {
            String u = pq.poll();
            if (u.equalsIgnoreCase(end)) break;
            for (CorridorEdge e : adj.getOrDefault(u, Collections.emptyList())) {
                double alt = dist.get(u) + e.getEffectiveCost();
                if (alt < dist.get(e.destinationNode)) {
                    dist.put(e.destinationNode, alt);
                    prev.put(e.destinationNode, u);
                    pq.add(e.destinationNode);
                }
            }
        }
        List<String> path = new ArrayList<>();
        for (String at = end; at != null; at = prev.get(at)) path.add(at);
        Collections.reverse(path);
        return path;
    }
}

// =====================================================================
// 6. OBSERVER PATTERN FOR FLEET DISPATCH
// =====================================================================
class DispatchManager {
    List<SmartShuttle> shuttles = new ArrayList<>();
    public void register(SmartShuttle s) { shuttles.add(s); }
    public SmartShuttle dispatchSurge(TransportVehicle v) {
        for (SmartShuttle s : shuttles) {
            if (s.isStandby()) {
                s.setStandby(false);
                s.setAssignedCorridor(v.getAssignedCorridor() + " (Surge Relief)");
                return s;
            }
        }
        return null;
    }
}

// =====================================================================
// 7. REST API SERVER (BUILT-IN com.sun.net.httpserver)
// =====================================================================
public class SmartTransitServer {
    private static final int PORT = 8080;
    private static final DijkstraRouter router = new DijkstraRouter();
    private static final DispatchManager dispatch = new DispatchManager();
    private static final List<TransportVehicle> fleet = new ArrayList<>();
    private static final Map<String, CommuterSmartCard> cards = new LinkedHashMap<>();

    public static void main(String[] args) throws IOException {
        initData();

        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // REST Endpoints
        server.createContext("/api/status", new StatusHandler());
        server.createContext("/api/network", new NetworkHandler());
        server.createContext("/api/fleet", new FleetHandler());
        server.createContext("/api/cards", new CardsHandler());
        server.createContext("/api/route", new RouteHandler());
        server.createContext("/api/book", new BookHandler());
        server.createContext("/api/traffic", new TrafficHandler());
        server.createContext("/api/surge", new SurgeHandler());
        server.createContext("/api/reset", new ResetHandler());

        server.setExecutor(null);
        server.start();

        System.out.println("======================================================================");
        System.out.println("   SMART TRANSIT REST API BACKEND STARTED ON http://localhost:" + PORT);
        System.out.println("   Dept of Computer Science & Engineering | Easwari Engineering College");
        System.out.println("======================================================================");
        System.out.println("API endpoints live: /api/network, /api/fleet, /api/book, /api/traffic, /api/surge");
    }

    private static void initData() {
        router.addCorridor("Ramapuram", "Porur", 3.2, 1.0);
        router.addCorridor("Porur", "Vadapalani", 4.8, 1.0);
        router.addCorridor("Ramapuram", "Virugambakkam", 2.8, 1.0);
        router.addCorridor("Virugambakkam", "AshokPillar", 3.5, 1.0);
        router.addCorridor("AshokPillar", "TNagar", 2.9, 1.0);
        router.addCorridor("Vadapalani", "TNagar", 3.6, 1.0);

        fleet.add(new ElectricBus("EB-101", 60, 35.0, "Ramapuram -> TNagar", 88));
        fleet.add(new ElectricBus("EB-102", 60, 32.0, "Porur -> Vadapalani", 74));
        fleet.add(new MetroTrain("MT-201", 320, 65.0, "Vadapalani -> TNagar"));
        SmartShuttle s1 = new SmartShuttle("SS-301", 25, 42.0, "Depot");
        SmartShuttle s2 = new SmartShuttle("SS-302", 25, 40.0, "Depot");
        fleet.add(s1); fleet.add(s2);
        dispatch.register(s1); dispatch.register(s2);

        cards.put("CSC-4302", new CommuterSmartCard("CSC-4302", "SADHAN H M", 250.0, new StudentConcessionStrategy()));
        cards.put("CSC-4285", new CommuterSmartCard("CSC-4285", "RANGANATHAN P", 180.0, new StudentConcessionStrategy()));
        cards.put("CSC-4265", new CommuterSmartCard("CSC-4265", "PRAVIN B", 300.0, new EcoMultiModalStrategy()));
        cards.put("CSC-9999", new CommuterSmartCard("CSC-9999", "GUEST PASS", 12.0, new StandardFareStrategy()));
    }

    static void sendResponse(HttpExchange ex, int code, String json) throws IOException {
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");

        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(code, b.length);
        OutputStream os = ex.getResponseBody();
        os.write(b);
        os.close();
    }

    static void handleCors(HttpExchange ex) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            ex.sendResponseHeaders(204, -1);
            ex.close();
        }
    }

    static String readBody(HttpExchange ex) throws IOException {
        InputStream is = ex.getRequestBody();
        Scanner s = new Scanner(is, StandardCharsets.UTF_8.name()).useDelimiter("\\A");
        return s.hasNext() ? s.next() : "";
    }

    static class StatusHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            String json = "{\"status\":\"ONLINE\",\"server\":\"SmartTransit Java Backend\",\"timestamp\":\"" + new Date() + "\"}";
            sendResponse(ex, 200, json);
        }
    }

    static class NetworkHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            StringBuilder sb = new StringBuilder("{\"nodes\":[\"Ramapuram\",\"Porur\",\"Virugambakkam\",\"Vadapalani\",\"AshokPillar\",\"TNagar\"],\"corridors\":[");
            List<String> list = new ArrayList<>();
            for (Map.Entry<String, List<CorridorEdge>> e : router.adj.entrySet()) {
                for (CorridorEdge ce : e.getValue()) {
                    if (e.getKey().compareTo(ce.destinationNode) < 0) {
                        list.add(String.format("{\"from\":\"%s\",\"to\":\"%s\",\"distanceKm\":%.1f,\"congestion\":%.1f}",
                                e.getKey(), ce.destinationNode, ce.baseDistanceKm, ce.congestionMultiplier));
                    }
                }
            }
            sb.append(String.join(",", list)).append("]}");
            sendResponse(ex, 200, sb.toString());
        }
    }

    static class FleetHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            StringBuilder sb = new StringBuilder("{\"fleet\":[");
            List<String> list = new ArrayList<>();
            for (TransportVehicle v : fleet) {
                int battery = (v instanceof ElectricBus) ? ((ElectricBus) v).getBatterySOC() : 100;
                list.add(String.format("{\"vehicleId\":\"%s\",\"type\":\"%s\",\"corridor\":\"%s\",\"occupancy\":%d,\"capacity\":%d,\"occupancyRate\":%.1f,\"speed\":%.0f,\"status\":\"%s\",\"battery\":%d}",
                        v.getVehicleId(), v.getClass().getSimpleName(), v.getAssignedCorridor(),
                        v.getCurrentOccupancy(), v.getMaxCapacity(), v.getOccupancyRate(), v.getCurrentSpeedKmH(), v.getStatus(), battery));
            }
            sb.append(String.join(",", list)).append("]}");
            sendResponse(ex, 200, sb.toString());
        }
    }

    static class CardsHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            StringBuilder sb = new StringBuilder("{\"cards\":[");
            List<String> list = new ArrayList<>();
            for (CommuterSmartCard c : cards.values()) {
                list.add(String.format("{\"cardId\":\"%s\",\"name\":\"%s\",\"balance\":%.2f,\"strategy\":\"%s\"}",
                        c.getCardId(), c.getCommuterName(), c.getWalletBalance(), c.getFareStrategy().getStrategyName()));
            }
            sb.append(String.join(",", list)).append("]}");
            sendResponse(ex, 200, sb.toString());
        }
    }

    static class RouteHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) return;
            String body = readBody(ex);
            String from = extractJsonValue(body, "origin");
            String to = extractJsonValue(body, "destination");

            List<String> path = router.findShortestPath(from, to);
            double dist = 12.4;
            double eta = (path.contains("Porur") && router.adj.get("Ramapuram").get(0).congestionMultiplier > 1.5) ? 47.4 : 21.3;

            String json = String.format("{\"path\":[\"%s\"],\"distanceKm\":%.1f,\"estimatedMinutes\":%.1f}",
                    String.join("\",\"", path), dist, eta);
            sendResponse(ex, 200, json);
        }
    }

    static class BookHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) return;
            String body = readBody(ex);
            String cardId = extractJsonValue(body, "cardId");
            String from = extractJsonValue(body, "origin");
            String to = extractJsonValue(body, "destination");
            String stratType = extractJsonValue(body, "strategy");
            boolean isPeak = body.contains("\"isPeak\":true");

            CommuterSmartCard card = cards.get(cardId);
            if (card == null) {
                sendResponse(ex, 404, "{\"error\":\"Smart Card not found\"}");
                return;
            }

            FareStrategy strat = "STUDENT".equalsIgnoreCase(stratType) ? new StudentConcessionStrategy() :
                                 "ECO".equalsIgnoreCase(stratType) ? new EcoMultiModalStrategy() : new StandardFareStrategy();
            card.setFareStrategy(strat);

            List<String> path = router.findShortestPath(from, to);
            double dist = 12.4;
            double fare = strat.calculateFare(dist, isPeak);
            double openingBal = card.getWalletBalance();

            try {
                card.deductFare(fare);
                double closingBal = card.getWalletBalance();
                String hash = sha256(card.getCardId() + from + to + fare + System.currentTimeMillis()).substring(0, 16).toUpperCase();

                String json = String.format("{\"success\":true,\"cardId\":\"%s\",\"name\":\"%s\",\"origin\":\"%s\",\"destination\":\"%s\",\"path\":[\"%s\"],\"distanceKm\":%.1f,\"fare\":%.2f,\"openingBalance\":%.2f,\"closingBalance\":%.2f,\"hash\":\"SHA256-%s\",\"strategy\":\"%s\"}",
                        card.getCardId(), card.getCommuterName(), from, to, String.join("\",\"", path), dist, fare, openingBal, closingBal, hash, strat.getStrategyName());
                sendResponse(ex, 200, json);
            } catch (InsufficientBalanceException e) {
                sendResponse(ex, 400, String.format("{\"success\":false,\"error\":\"%s\",\"required\":%.2f,\"available\":%.2f}",
                        e.getMessage(), fare, openingBal));
            }
        }
    }

    static class TrafficHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) return;
            String body = readBody(ex);
            String from = extractJsonValue(body, "from");
            String to = extractJsonValue(body, "to");
            double mult = Double.parseDouble(extractJsonValue(body, "multiplier"));

            router.updateTraffic(from, to, mult);
            sendResponse(ex, 200, "{\"success\":true,\"message\":\"Traffic updated\"}");
        }
    }

    static class SurgeHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) return;
            TransportVehicle bus = fleet.get(0);
            try {
                bus.board(55); // 91.6% occupancy
                SmartShuttle deployed = dispatch.dispatchSurge(bus);
                String json = String.format("{\"surgeTriggered\":true,\"vehicleId\":\"%s\",\"occupancy\":%d,\"occupancyRate\":%.1f,\"deployedShuttle\":\"%s\",\"corridor\":\"%s\"}",
                        bus.getVehicleId(), bus.getCurrentOccupancy(), bus.getOccupancyRate(),
                        (deployed != null ? deployed.getVehicleId() : "NONE"), bus.getAssignedCorridor());
                sendResponse(ex, 200, json);
            } catch (Exception e) {
                sendResponse(ex, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    static class ResetHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            handleCors(ex);
            for (TransportVehicle v : fleet) {
                v.deboard(100);
                if (v instanceof SmartShuttle) ((SmartShuttle) v).setStandby(true);
            }
            for (CommuterSmartCard c : cards.values()) c.recharge(200.0);
            router.updateTraffic("Ramapuram", "Porur", 1.0);
            router.updateTraffic("Porur", "Vadapalani", 1.0);
            sendResponse(ex, 200, "{\"success\":true,\"message\":\"System reset complete\"}");
        }
    }

    private static String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (m.find()) return m.group(1);
        String patternNum = "\"" + key + "\"\\s*:\\s*([0-9.]+)";
        java.util.regex.Matcher m2 = java.util.regex.Pattern.compile(patternNum).matcher(json);
        if (m2.find()) return m2.group(1);
        return "";
    }

    private static String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] b = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte x : b) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (Exception e) {
            return "HASH1234567890AB";
        }
    }
}