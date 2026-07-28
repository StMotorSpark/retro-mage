const fs = require('fs');
let code = fs.readFileSync('packages/engine-core/src/world_transport.rs', 'utf8');

code = code.replace(/instances: usize, overflow: bool,\n    crossing_pose: Transform,/,
`instances: usize, overflow: bool,
    frame: u64,
    overflow_diagnostics: Vec<String>,
    skipped_instances: Vec<String>,
    crossing_pose: Transform,`);

code = code.replace(/tiles: 0, actors: 0, lights: 0, instances: 0, overflow: false, crossing_pose: Transform::IDENTITY, scheduler: crate::streaming_scheduler::StreamingScheduler::new\(policy\),/,
`tiles: 0, actors: 0, lights: 0, instances: 0, overflow: false, crossing_pose: Transform::IDENTITY, scheduler: crate::streaming_scheduler::StreamingScheduler::new(policy), frame: 0, overflow_diagnostics: vec![], skipped_instances: vec![],`);

code = code.replace(/        self\.tiles = 0; self\.actors = 0; self\.lights = 0; self\.instances = 0; self\.instance_ids\.clear\(\);\n        let entries: Vec<_> = self\.runtime\.resident_global_content\(\)\.map\(\|\(id, content\)\| \(id\.to_owned\(\), content\.clone\(\)\)\)\.collect\(\);\n        let ids: Vec<_> = self\.runtime\.instances\(\)\.map\(\|instance\| instance\.id\.clone\(\)\)\.collect\(\);\n        for id in ids \{\n            if self\.instances >= self\.instance_states\.len\(\) \{ self\.overflow = true; break; \}\n            let Some\(instance\) = self\.runtime\.instance\(&id\) else \{ continue \};\n            self\.instance_ids\.push\(id\.clone\(\)\); self\.instance_states\[self\.instances\] = state_code\(instance\.state\); self\.instance_render\[self\.instances\] = instance\.render_resident as u8 as f32; self\.instance_collision\[self\.instances\] = instance\.collision_active as u8 as f32; self\.instance_simulation\[self\.instances\] = instance\.simulation_active as u8 as f32; self\.instances \+= 1;\n            let Some\(content\) = entries\.iter\(\)\.find\(\|\(entry_id, _\)\| entry_id == &id\)\.map\(\|\(_, content\)\| content\) else \{ continue \};\n            for tile in &content\.tiles \{ if self\.tiles >= self\.tile_x\.len\(\) \{ self\.overflow = true; break; \} let i = self\.tiles; self\.tile_x\[i\]=tile\.position\.x; self\.tile_y\[i\]=tile\.position\.y; self\.tile_z\[i\]=tile\.position\.z; self\.tile_id\[i\]=tile\.tile_id as f32; self\.tile_material\[i\]=tile\.material_id as f32; self\.tile_variant\[i\]=tile\.variant as f32; self\.tile_orientation\[i\]=tile\.orientation as f32; self\.tile_solid\[i\]=tile\.solid as u8 as f32; self\.tile_north\[i\]=tile\.openings\.north as u8 as f32; self\.tile_east\[i\]=tile\.openings\.east as u8 as f32; self\.tile_south\[i\]=tile\.openings\.south as u8 as f32; self\.tile_west\[i\]=tile\.openings\.west as u8 as f32; self\.tile_opening\[i\]=tile\.openings\.vertical as u8 as f32; self\.tiles\+=1; \}\n            for actor in &content\.actors \{ if self\.actors >= self\.actor_x\.len\(\) \{ self\.overflow=true; break; \} let i=self\.actors; self\.actor_x\[i\]=actor\.position\.x; self\.actor_y\[i\]=actor\.position\.y; self\.actor_z\[i\]=actor\.position\.z; self\.actor_facing\[i\]=actor\.facing; self\.actor_sprite\[i\]=actor\.sprite_id as f32; self\.actor_active\[i\]=actor\.active as u8 as f32; self\.actors\+=1; \}\n            for light in &content\.lights \{ if self\.lights >= self\.light_x\.len\(\) \{ self\.overflow=true; break; \} let i=self\.lights; self\.light_x\[i\]=light\.position\.x; self\.light_y\[i\]=light\.position\.y; self\.light_z\[i\]=light\.position\.z; self\.light_r\[i\]=light\.color\[0\]; self\.light_g\[i\]=light\.color\[1\]; self\.light_b\[i\]=light\.color\[2\]; self\.light_intensity\[i\]=light\.intensity; self\.light_active\[i\]=light\.active as u8 as f32; self\.lights\+=1; \}\n        \}/,
`        self.frame += 1;
        self.overflow_diagnostics.clear();
        self.skipped_instances.clear();
        self.tiles = 0; self.actors = 0; self.lights = 0; self.instances = 0; self.instance_ids.clear();
        self.overflow = false;
        let entries: Vec<_> = self.runtime.resident_global_content().map(|(id, content)| (id.to_owned(), content.clone())).collect();
        let ids: Vec<_> = self.runtime.instances().map(|instance| instance.id.clone()).collect();
        for id in ids {
            let Some(instance) = self.runtime.instance(&id) else { continue };
            let content_opt = entries.iter().find(|(entry_id, _)| entry_id == &id).map(|(_, content)| content);
            
            let (t_len, a_len, l_len) = if let Some(c) = content_opt { (c.tiles.len(), c.actors.len(), c.lights.len()) } else { (0, 0, 0) };
            
            let instances_req = self.instances + 1;
            let t_req = self.tiles + t_len;
            let a_req = self.actors + a_len;
            let l_req = self.lights + l_len;

            if instances_req > self.instance_states.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\\\"frame\\\":{},\\\"category\\\":\\\"instances\\\",\\\"requested\\\":{},\\\"capacity\\\":{},\\\"instance_id\\\":\\\"{}\\\"}}", self.frame, instances_req, self.instance_states.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if t_req > self.tile_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\\\"frame\\\":{},\\\"category\\\":\\\"tiles\\\",\\\"requested\\\":{},\\\"capacity\\\":{},\\\"instance_id\\\":\\\"{}\\\"}}", self.frame, t_req, self.tile_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if a_req > self.actor_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\\\"frame\\\":{},\\\"category\\\":\\\"actors\\\",\\\"requested\\\":{},\\\"capacity\\\":{},\\\"instance_id\\\":\\\"{}\\\"}}", self.frame, a_req, self.actor_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }
            if l_req > self.light_x.len() {
                self.overflow = true;
                self.overflow_diagnostics.push(format!("{{\\\"frame\\\":{},\\\"category\\\":\\\"lights\\\",\\\"requested\\\":{},\\\"capacity\\\":{},\\\"instance_id\\\":\\\"{}\\\"}}", self.frame, l_req, self.light_x.len(), id));
                self.skipped_instances.push(id.clone());
                continue;
            }

            self.instance_ids.push(id.clone()); self.instance_states[self.instances] = state_code(instance.state); self.instance_render[self.instances] = instance.render_resident as u8 as f32; self.instance_collision[self.instances] = instance.collision_active as u8 as f32; self.instance_simulation[self.instances] = instance.simulation_active as u8 as f32; self.instances += 1;
            if let Some(content) = content_opt {
                for tile in &content.tiles { let i = self.tiles; self.tile_x[i]=tile.position.x; self.tile_y[i]=tile.position.y; self.tile_z[i]=tile.position.z; self.tile_id[i]=tile.tile_id as f32; self.tile_material[i]=tile.material_id as f32; self.tile_variant[i]=tile.variant as f32; self.tile_orientation[i]=tile.orientation as f32; self.tile_solid[i]=tile.solid as u8 as f32; self.tile_north[i]=tile.openings.north as u8 as f32; self.tile_east[i]=tile.openings.east as u8 as f32; self.tile_south[i]=tile.openings.south as u8 as f32; self.tile_west[i]=tile.openings.west as u8 as f32; self.tile_opening[i]=tile.openings.vertical as u8 as f32; self.tiles+=1; }
                for actor in &content.actors { let i=self.actors; self.actor_x[i]=actor.position.x; self.actor_y[i]=actor.position.y; self.actor_z[i]=actor.position.z; self.actor_facing[i]=actor.facing; self.actor_sprite[i]=actor.sprite_id as f32; self.actor_active[i]=actor.active as u8 as f32; self.actors+=1; }
                for light in &content.lights { let i=self.lights; self.light_x[i]=light.position.x; self.light_y[i]=light.position.y; self.light_z[i]=light.position.z; self.light_r[i]=light.color[0]; self.light_g[i]=light.color[1]; self.light_b[i]=light.color[2]; self.light_intensity[i]=light.intensity; self.light_active[i]=light.active as u8 as f32; self.lights+=1; }
            }
        }`);

code = code.replace(/pub fn overflowed\(\&self\) \-> bool \{ self\.overflow \}/,
`pub fn overflowed(&self) -> bool { self.overflow }
    pub fn overflow_diagnostics_json(&self) -> String { format!("[{}]", self.overflow_diagnostics.join(",")) }
    pub fn skipped_instances_json(&self) -> String { format!("[{}]", self.skipped_instances.iter().map(|s| format!("\\\"{}\\\"", s)).collect::<Vec<_>>().join(",")) }`);

fs.writeFileSync('packages/engine-core/src/world_transport.rs', code);
