// shared/serviceRegistry.js

/**
 * Service Registry for simulated microservice architecture
 * Tracks registered services, their health, and provides discovery
 */
class ServiceRegistry {
    constructor() {
        this.services = new Map();
    }

    /**
     * Register a service
     * @param {string} name - Service name
     * @param {object} config - Service configuration
     * @param {string} config.description - Service description
     * @param {string[]} config.routes - API route prefixes
     * @param {function} [config.healthCheck] - Custom health check function
     */
    register(name, config) {
        this.services.set(name, {
            name,
            description: config.description || '',
            routes: config.routes || [],
            status: 'healthy',
            registeredAt: new Date().toISOString(),
            lastHealthCheck: new Date().toISOString(),
            healthCheck: config.healthCheck || null,
            requestCount: 0
        });

        console.log(`  🏢 [ServiceRegistry] Registered: ${name} (${config.routes?.join(', ') || 'no routes'})`);
    }

    /**
     * Get a registered service
     */
    get(name) {
        return this.services.get(name);
    }

    /**
     * Get all registered services
     */
    getAll() {
        const result = {};
        for (const [name, service] of this.services) {
            result[name] = {
                name: service.name,
                description: service.description,
                status: service.status,
                routes: service.routes,
                registeredAt: service.registeredAt,
                lastHealthCheck: service.lastHealthCheck
            };
        }
        return result;
    }

    /**
     * Run health checks on all services
     */
    async healthCheck() {
        const results = {};

        for (const [name, service] of this.services) {
            try {
                if (service.healthCheck) {
                    const isHealthy = await service.healthCheck();
                    service.status = isHealthy ? 'healthy' : 'degraded';
                } else {
                    service.status = 'healthy';
                }
                service.lastHealthCheck = new Date().toISOString();

                results[name] = {
                    status: service.status,
                    lastCheck: service.lastHealthCheck,
                    routes: service.routes
                };
            } catch (err) {
                service.status = 'unhealthy';
                results[name] = {
                    status: 'unhealthy',
                    error: err.message,
                    lastCheck: new Date().toISOString()
                };
            }
        }

        return results;
    }

    /**
     * Get quick summary for health endpoint
     */
    getSummary() {
        const total = this.services.size;
        let healthy = 0;
        let degraded = 0;
        let unhealthy = 0;

        for (const [, service] of this.services) {
            if (service.status === 'healthy') healthy++;
            else if (service.status === 'degraded') degraded++;
            else unhealthy++;
        }

        return { total, healthy, degraded, unhealthy };
    }
}

// Singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = { serviceRegistry };
