// shared/eventBus.js
const EventEmitter = require('events');

/**
 * Internal Event Bus for simulated microservice communication
 * Provides publish/subscribe pattern within a single process
 */
class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Allow many service subscriptions
        this.eventLog = [];
    }

    /**
     * Publish an event with data
     * @param {string} event - Event name (e.g. 'BOOKING_CREATED')
     * @param {object} data - Event payload
     */
    publish(event, data) {
        const eventRecord = {
            event,
            timestamp: new Date().toISOString(),
            dataKeys: data ? Object.keys(data) : []
        };

        this.eventLog.push(eventRecord);

        // Keep only last 100 events in log
        if (this.eventLog.length > 100) {
            this.eventLog = this.eventLog.slice(-100);
        }

        console.log(`  📡 [EventBus] Published: ${event}`);
        this.emit(event, data);
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} handler - Event handler function
     * @param {string} serviceName - Subscribing service name (for logging)
     */
    subscribe(event, handler, serviceName = 'unknown') {
        console.log(`  📡 [EventBus] ${serviceName} subscribed to: ${event}`);
        this.on(event, async (data) => {
            try {
                await handler(data);
            } catch (err) {
                console.error(`  ❌ [EventBus] Error in ${serviceName} handler for ${event}: ${err.message}`);
            }
        });
    }

    /**
     * Get recent event log for debugging
     */
    getEventLog(limit = 20) {
        return this.eventLog.slice(-limit);
    }

    /**
     * Get subscriptions info
     */
    getSubscriptions() {
        const events = this.eventNames().filter(e => typeof e === 'string');
        return events.map(event => ({
            event,
            listenerCount: this.listenerCount(event)
        }));
    }
}

// Singleton instance
const eventBus = new EventBus();

// Standard event names
const EVENTS = {
    // Booking events
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    BOOKING_STATUS_CHANGED: 'BOOKING_STATUS_CHANGED',

    // Payment events
    PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',

    // Agent events
    AGENT_REGISTERED: 'AGENT_REGISTERED',
    AGENT_ROLE_CHANGED: 'AGENT_ROLE_CHANGED',
    AGENT_APPROVED: 'AGENT_APPROVED',

    // Lead events
    LEAD_CREATED: 'LEAD_CREATED',
    LEAD_CONVERTED: 'LEAD_CONVERTED',

    // Commission events
    COMMISSION_CREATED: 'COMMISSION_CREATED',
    COMMISSION_APPROVED: 'COMMISSION_APPROVED',

    // Notification events
    NOTIFICATION_SENT: 'NOTIFICATION_SENT'
};

module.exports = { eventBus, EVENTS };
