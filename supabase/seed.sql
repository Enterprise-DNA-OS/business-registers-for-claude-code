insert into registers.registers(id,name,description,personal_data,purpose) values
('10000000-0000-4000-8000-000000000001','Client services','Fictional Harbour Research operations',false,'Delivery tracking'),
('10000000-0000-4000-8000-000000000002','Research participants','Fictional consent and interview records',true,'Arrange interviews for commissioned research'),
('10000000-0000-4000-8000-000000000003','Evidence library','Document metadata, not file storage',false,'Source verification') on conflict do nothing;
insert into registers.fields(id,register_id,name,kind,required,options) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Client','text',true,'[]'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Hours','number',false,'[]'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','Consent recorded','boolean',true,'[]'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000003','Source','text',true,'[]') on conflict do nothing;
insert into registers.records(id,register_id,title,owner,status,due_on,review_due_on,retain_until,values,updated_at) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Kauri customer report','Aroha','active',current_date-3,current_date+14,null,'{"Client":"Kauri Foods","Hours":24}',now()-interval '35 days'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Harbour interview summary','Ben','waiting',current_date+2,current_date+7,null,'{"Client":"Harbour Logistics","Hours":12}',now()),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Kauri follow-up','', 'open',current_date-1,null,null,'{"Hours":4}',now()),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','Participant interview 014','Ben','active',current_date+1,current_date-6,current_date+60,'{"Consent recorded":true}',now()),
('30000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002','Participant interview 008','Aroha','done',current_date-80,current_date-45,current_date-10,'{"Consent recorded":true}',now()),
('30000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000003','Kauri source reconciliation','Mere','active',current_date-2,current_date+14,null,'{"Source":"Private archive reference HR-42"}',now()),
('30000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000003','Harbour transcript sign-off','Mere','open',current_date+1,current_date+14,null,'{"Source":"Private archive reference HR-43"}',now()),
('30000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','Monthly research handover','Aroha','done',current_date-7,current_date+7,null,'{"Client":"Harbour Logistics","Hours":8}',now()) on conflict do nothing;
insert into registers.links(id,from_id,to_id,kind) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','depends-on'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000007','depends-on'),
('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004','related') on conflict do nothing;
