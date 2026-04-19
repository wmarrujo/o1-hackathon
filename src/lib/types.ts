export interface Patient {
	id: string;
	name: string;
	date_of_birth?: string;
	notes?: string;
	created_at: string;
}

export interface Member {
	id: string;
	user_id: string;
	patient_id: string;
	coordinator: boolean;
	created_at: string;
}

export interface Task {
	id: string;
	patient_id: string;
	description: string;
	start_time?: string | null;
	due_time?: string | null;
	assignee_id?: string | null;
	location?: string | null;
	repeat?: 'daily' | 'weekly' | 'monthly' | null;
	complete: boolean;
	completed_at?: string | null;
	completed_by?: string | null;
	created_at: string;
	created_by?: string | null;
}

export interface Note {
	id: string;
	patient_id: string;
	task_id?: string | null;
	author_id: string;
	content: string;
	created_at: string;
}

export interface UserProfile {
	id: string;
	email: string;
	full_name?: string | null;
}
