import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectCard } from './project-card';
import { Project } from '../../models/project.models';

const mockProject: Project = {
      id: 1,
      name: 'Refonte Facturation',
      description: 'Migration vers la nouvelle API de paiement',
      status: 'actif',
      tasksCount: 13,
      ownerEmail: 'moustapha@taskflow.dev',
      ownerName: 'Moustapha Diouf'
  };
describe('ProjectCard', () => {
  let component: ProjectCard;
  let fixture: ComponentFixture<ProjectCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('project', mockProject);
    fixture.detectChanges(); // Déclenche la détection des changements pour initialiser le composant
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('émet selected avec le projet recu quand on clique dessus', () => {
    const emitted: Project[] = [];
    component.selected.subscribe((project) => emitted.push(project));
    (fixture.nativeElement as HTMLElement).querySelector('.project-card')?.dispatchEvent(new Event('click'));
    expect(emitted[0]).toEqual(mockProject);
    expect(emitted).toEqual([mockProject]);
  });
});
