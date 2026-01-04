
/**
 * AgentApexActions.cls
 * 
 * This class exposes invocable methods for the Agent to call via REST API or Flow.
 */
public with sharing class AgentApexActions {
    
    public class RefundRequest {
        @InvocableVariable(required=true)
        public String orderId;
        
        @InvocableVariable
        public String reason;
    }

    public class RefundResult {
        @InvocableVariable
        public Boolean isEligible;
        
        @InvocableVariable
        public String message;
    }

    @InvocableMethod(label='Validate Refund Eligibility' description='Checks if an order is eligible for refund based on business rules.')
    public static List<RefundResult> validateRefund(List<RefundRequest> requests) {
        List<RefundResult> results = new List<RefundResult>();
        
        for (RefundRequest req : requests) {
            RefundResult res = new RefundResult();
            // Mock logic: Orders starting with 'ORD-9' are eligible
            if (req.orderId != null && req.orderId.startsWith('ORD-9')) {
                res.isEligible = true;
                res.message = 'Order is within 30 days window.';
            } else {
                res.isEligible = false;
                res.message = 'Order outside of return window or not found.';
            }
            results.add(res);
        }
        
        return results;
    }
}
