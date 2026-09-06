import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEvent, bookingProperties } from '../lib/analytics-policy.ts';
const tutor={id:'test-tutor',name:'Sample Tutor',subjects:['Algebra II'],grades:[9,10],rate:45};
test('booking properties use explicit business fields and keep unknown grade null',()=>{
 const props=bookingProperties(tutor,'Algebra II','','2026-09-10T20:00:00.000Z','attempt-test');
 assert.equal(props.grade,null);assert.equal(props.hourly_rate,45);assert.equal(props.session_start,'2026-09-10T20:00:00.000Z');assert.equal(props.booking_attempt_id,'attempt-test');assert.match(props.session_date,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(bookingProperties(tutor,'Algebra II','0','2026-09-10T20:00:00.000Z','a').grade,0);
});
test('privacy boundary drops personal fields and arbitrary nested data',()=>{
 const event=sanitizeEvent({event:'booking_completed',properties:{...bookingProperties(tutor,'Algebra II','9','2026-09-10T20:00:00.000Z','a'),parentName:'PRIVATE_PARENT',email:'PRIVATE_EMAIL@example.com',studentName:'PRIVATE_STUDENT',form:{note:'PRIVATE_NOTE'},$set:{email:'PRIVATE_EMAIL@example.com'},$elements:[{text:'PRIVATE_STUDENT'}],$device_type:'Mobile',$session_id:'session-test'}});
 const json=JSON.stringify(event);assert.ok(!json.includes('PRIVATE_'));assert.equal(event.properties.$device_type,'Mobile');assert.equal(event.properties.grade,9);assert.equal(event.properties.$session_id,'session-test');
});
test('automatic page/activity events preserve campaign attribution while scrubbing URLs',()=>{
 for(const name of ['$pageview','$pageleave','$autocapture']){
 const event=sanitizeEvent({event:name,properties:{$current_url:'https://example.com/?utm_source=facebook&utm_campaign=local_group&email=PRIVATE#PRIVATE',$referrer:'https://facebook.com/groups/PRIVATE?email=PRIVATE',$device_type:'Mobile',utm_source:'facebook',utm_campaign:'local_group',utm_content:'PRIVATE@example.com',$event_type:'click'}});
 assert.equal(event.properties.$current_url,'https://example.com/?utm_source=facebook&utm_campaign=local_group');assert.equal(event.properties.$referrer,'https://facebook.com/');assert.equal(event.properties.utm_source,'facebook');assert.ok(!JSON.stringify(event).includes('PRIVATE'));
 }
});
test('unrequested replay, identity and exception payloads cannot pass the boundary',()=>{
 for(const event of ['$snapshot','$identify','$exception','unknown_event'])assert.equal(sanitizeEvent({event,properties:{}}),null);
});
