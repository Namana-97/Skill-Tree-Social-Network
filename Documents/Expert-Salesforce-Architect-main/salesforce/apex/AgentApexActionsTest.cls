
@isTest
private class AgentApexActionsTest {
    @isTest static void testRefundValidation() {
        AgentApexActions.RefundRequest req1 = new AgentApexActions.RefundRequest();
        req1.orderId = 'ORD-999';
        req1.reason = 'Broken';

        AgentApexActions.RefundRequest req2 = new AgentApexActions.RefundRequest();
        req2.orderId = 'ORD-111';
        req2.reason = 'Changed Mind';

        List<AgentApexActions.RefundRequest> requests = new List<AgentApexActions.RefundRequest>{req1, req2};
        
        Test.startTest();
        List<AgentApexActions.RefundResult> results = AgentApexActions.validateRefund(requests);
        Test.stopTest();
        
        System.assertEquals(2, results.size());
        System.assertEquals(true, results[0].isEligible);
        System.assertEquals(false, results[1].isEligible);
    }
}
