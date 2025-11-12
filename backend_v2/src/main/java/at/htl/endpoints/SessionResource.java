package at.htl.endpoints;

import at.htl.entity.Session;
import at.htl.entity.SessionServiceType;
import at.htl.entity.ServiceType;
import at.htl.entity.User;
import at.htl.entity.Market;
import at.htl.repository.SessionRepository;
import at.htl.repository.SessionServiceTypeRepository;
import at.htl.repository.ServiceTypeRepository;
import at.htl.repository.UserRepository;
import at.htl.repository.MarketRepository;
import at.htl.repository.ServiceRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.*;
import java.util.stream.Collectors;

@Path("session")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SessionResource {

    @Inject
    SessionRepository sessionRepository;

    @Inject
    SessionServiceTypeRepository sessionServiceTypeRepository;

    @Inject
    ServiceTypeRepository serviceTypeRepository;

    @Inject
    UserRepository userRepository;
    
    @Inject
    MarketRepository marketRepository;
    
    @Inject
    ServiceRepository serviceRepository;

    @POST
    @Path("/create")
    @Transactional
    public Response createSession() {
        // Generiere UUID für Session
        String sessionId = UUID.randomUUID().toString();
        
        Session session = new Session(sessionId);
        sessionRepository.persist(session);
        
        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("expiresAt", session.getExpiresAt().getTime());
        response.put("isAnonymous", session.isAnonymous());
        
        return Response.ok(response).build();
    }

    @GET
    @Path("/{sessionId}")
    @Transactional
    public Response getSession(@PathParam("sessionId") String sessionId) {
        Session session = sessionRepository.findByIdOrNull(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Session nicht gefunden oder abgelaufen")
                    .build();
        }
        
        // Hole alle gespeicherten ServiceTypes
        List<SessionServiceType> sessionServiceTypes = 
                sessionServiceTypeRepository.findBySession(session);
        
        List<Long> offers = sessionServiceTypes.stream()
                .filter(SessionServiceType::isOffer)
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        List<Long> demands = sessionServiceTypes.stream()
                .filter(sst -> !sst.isOffer())
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("isAnonymous", session.isAnonymous());
        response.put("expiresAt", session.getExpiresAt().getTime());
        response.put("offers", offers);
        response.put("demands", demands);
        
        if (session.getUser() != null) {
            response.put("username", session.getUser().getName());
        }
        
        return Response.ok(response).build();
    }

    @PUT
    @Path("/{sessionId}/services")
    @Transactional
    public Response updateSessionServices(
            @PathParam("sessionId") String sessionId,
            Map<String, List<Long>> data) {
        
        Session session = sessionRepository.findByIdOrNull(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Session nicht gefunden oder abgelaufen")
                    .build();
        }
        
        // Lösche alte Einträge
        sessionServiceTypeRepository.deleteBySession(session);
        
        // Füge Angebote hinzu (mit IDs)
        List<Long> offers = data.getOrDefault("offers", new ArrayList<>());
        for (Long offerId : offers) {
            ServiceType serviceType = serviceTypeRepository.findById(offerId);
            if (serviceType != null) {
                SessionServiceType sst = new SessionServiceType(session, serviceType, true);
                sessionServiceTypeRepository.persist(sst);
            }
        }
        
        // Füge Gesuche hinzu (mit IDs)
        List<Long> demands = data.getOrDefault("demands", new ArrayList<>());
        for (Long demandId : demands) {
            ServiceType serviceType = serviceTypeRepository.findById(demandId);
            if (serviceType != null) {
                SessionServiceType sst = new SessionServiceType(session, serviceType, false);
                sessionServiceTypeRepository.persist(sst);
            }
        }
        
        return Response.ok().entity("Session aktualisiert").build();
    }

    @POST
    @Path("/{sessionId}/attach-user")
    @Transactional
    public Response attachUserToSession(
            @PathParam("sessionId") String sessionId,
            Map<String, String> data) {
        
        Session session = sessionRepository.findByIdOrNull(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Session nicht gefunden")
                    .build();
        }
        
        String username = data.get("username");
        User user = userRepository.find("name", username).firstResult();
        
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Benutzer nicht gefunden")
                    .build();
        }
        
        session.setUser(user);
        session.setAnonymous(false);
        sessionRepository.persist(session);
        
        return Response.ok().entity("Benutzer mit Session verknüpft").build();
    }

    @POST
    @Path("/{sessionId}/convert-to-markets")
    @Transactional
    public Response convertSessionToMarkets(@PathParam("sessionId") String sessionId) {
        Session session = sessionRepository.findByIdOrNull(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Session nicht gefunden")
                    .build();
        }
        
        if (session.getUser() == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Session muss mit einem Benutzer verknüpft sein")
                    .build();
        }
        
        List<SessionServiceType> sessionServiceTypes = 
                sessionServiceTypeRepository.findBySession(session);
        
        // Konvertiere zu Market-Einträgen über den MarketResource
        Map<String, Object> marketData = new HashMap<>();
        
        List<Long> offers = sessionServiceTypes.stream()
                .filter(SessionServiceType::isOffer)
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        List<Long> demands = sessionServiceTypes.stream()
                .filter(sst -> !sst.isOffer())
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        marketData.put("offers", offers);
        marketData.put("demands", demands);
        marketData.put("username", session.getUser().getName());
        
        // Lösche Session-Daten nach Konvertierung
        sessionServiceTypeRepository.deleteBySession(session);
        
        return Response.ok(marketData)
                .entity("Session zu Markets konvertiert")
                .build();
    }

    @GET
    @Path("/{sessionId}/matches")
    @Transactional
    public Response getSessionMatches(@PathParam("sessionId") String sessionId) {
        Session session = sessionRepository.findByIdOrNull(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity("Session nicht gefunden")
                    .build();
        }
        
        // Hole Session ServiceTypes
        List<SessionServiceType> sessionServices = 
                sessionServiceTypeRepository.findBySession(session);
        
        if (sessionServices.isEmpty()) {
            return Response.ok(Collections.emptyList()).build();
        }
        
        // Separiere Offers und Demands
        List<Long> sessionOfferIds = sessionServices.stream()
                .filter(SessionServiceType::isOffer)
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        List<Long> sessionDemandIds = sessionServices.stream()
                .filter(sst -> !sst.isOffer())
                .map(sst -> sst.getServiceType().getId())
                .collect(Collectors.toList());
        
        // Nutze die gemeinsame Matching-Methode
        List<Map<String, Object>> matches = serviceRepository.findMatchesWithPerfectMatchFlag(
            sessionOfferIds, 
            sessionDemandIds
        );
        
        return Response.ok(matches).build();
    }

    @DELETE
    @Path("/{sessionId}")
    @Transactional
    public Response deleteSession(@PathParam("sessionId") String sessionId) {
        Session session = sessionRepository.findById(sessionId);
        
        if (session == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        sessionServiceTypeRepository.deleteBySession(session);
        sessionRepository.delete(session);
        
        return Response.ok().entity("Session gelöscht").build();
    }
}
