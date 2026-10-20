import hashlib
import json
from sqlalchemy.orm import Session
from app.models.access_log import AccessLog
from app.models.proposal import Proposal
from app.models.user import User
from app.models.worker import WorkerProfile


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_worker_account(db: Session, worker: WorkerProfile) -> User:
    if worker.user_id:
        existing = db.query(User).filter(User.id == worker.user_id).first()
        if existing:
            return existing

    username = f"op.{worker.dni}"
    plain_password = f"mina{worker.dni[-4:]}"

    existing_user = (
        db.query(User)
        .filter((User.username == username) | (User.email == worker.email))
        .first()
    )
    if existing_user:
        worker.user_id = existing_user.id
        worker.generated_username = existing_user.username
        worker.generated_password = existing_user.plain_password_hint or plain_password
        return existing_user

    new_user = User(
        email=worker.email,
        username=username,
        password_hash=hash_password(plain_password),
        plain_password_hint=plain_password,
        role="TRABAJADOR",
        full_name=f"{worker.first_name} {worker.last_name}",
        company_name=worker.proposal.provider_company_name
        if worker.proposal
        else "Contratista Minero",
    )
    db.add(new_user)
    db.flush()

    worker.user_id = new_user.id
    worker.generated_username = username
    worker.generated_password = plain_password
    return new_user


def seed_database(db: Session):
    if db.query(User).count() > 0:
        return

    minera_user = User(
        email="minera@safemine.pe",
        username="minera",
        password_hash=hash_password("minera123"),
        plain_password_hint="minera123",
        role="MINERA",
        full_name="Ing. Roberto Vargas (Gerencia SSO Minera)",
        company_name="Compañía Minera SafeMine Andes S.A.A.",
        ruc="20100123456",
    )
    db.add(minera_user)

    proveedor_user = User(
        email="proveedor@contratistasperu.pe",
        username="proveedor",
        password_hash=hash_password("proveedor123"),
        plain_password_hint="proveedor123",
        role="PROVEEDOR",
        full_name="Ing. Elena Salazar (Gerente de Operaciones)",
        company_name="Contratistas Mineros del Sur S.A.C.",
        ruc="20604589123",
    )
    db.add(proveedor_user)
    db.flush()

    required_epps_json = json.dumps(["HEAD_COVER", "HAND_COVER", "FACE_COVER"])

    # Propuesta #1: POSTULADA con 10 trabajadores lista para aceptar
    proposal_ready = Proposal(
        title="Mantenimiento de Planta Concentradora - Guardia A",
        description=(
            "Convocatoria para 10 especialistas en mantenimiento mecánico, cambio de liners en molino SAG "
            "y soldadura estructural. Uso obligatorio de Casco, Guantes y Protección Facial."
        ),
        quota=10,
        start_date="2026-11-01",
        required_epps=required_epps_json,
        status="POSTULADA",
        provider_id=proveedor_user.id,
        provider_company_name=proveedor_user.company_name,
    )
    db.add(proposal_ready)
    db.flush()

    squad_1_candidates = [
        ("Miguel", "Cáceres Soto", "71203401", "miguel.caceres@contratistasperu.pe", "Supervisor Mecánico"),
        ("Andrés", "Villanueva Ríos", "71203402", "andres.villanueva@contratistasperu.pe", "Soldador Homologado 6G"),
        ("Pedro", "Chávez Mamani", "71203403", "pedro.chavez@contratistasperu.pe", "Técnico Mecánico Molinos"),
        ("Ramiro", "Paredes Condori", "71203404", "ramiro.paredes@contratistasperu.pe", "Montajista Estructural"),
        ("Héctor", "Salinas Huanca", "71203405", "hector.salinas@contratistasperu.pe", "Rigger de Izaje"),
        ("Óscar", "Zevallos Tapia", "71203406", "oscar.zevallos@contratistasperu.pe", "Técnico de Lubricación"),
        ("Víctor", "Aguilar Flores", "71203407", "victor.aguilar@contratistasperu.pe", "Soldador Estructural"),
        ("César", "Palomino Vega", "71203408", "cesar.palomino@contratistasperu.pe", "Mecánico de Chancado"),
        ("Rubén", "Gutiérrez Puma", "71203409", "ruben.gutierrez@contratistasperu.pe", "Electricista Industrial"),
        ("Daniel", "Ochoa Medina", "71203410", "daniel.ochoa@contratistasperu.pe", "Prevencionista PDR"),
    ]

    for fn, ln, dni, email, pos in squad_1_candidates:
        db.add(
            WorkerProfile(
                proposal_id=proposal_ready.id,
                first_name=fn,
                last_name=ln,
                dni=dni,
                email=email,
                position=pos,
            )
        )

    # Propuesta #2: ACEPTADA con 10 trabajadores ya con cuentas creadas
    proposal_active = Proposal(
        title="Parada de Planta - Instrumentación y Montaje Eléctrico",
        description=(
            "Cuadrilla de 10 operarios acreditados para mantenimiento de tableros de media tensión, "
            "instrumentación de celdas de flotación y tendido de fibra óptica en planta."
        ),
        quota=10,
        start_date="2026-10-20",
        required_epps=required_epps_json,
        status="ACEPTADA",
        provider_id=proveedor_user.id,
        provider_company_name=proveedor_user.company_name,
    )
    db.add(proposal_active)
    db.flush()

    squad_2_workers = [
        {
            "first_name": "Carlos",
            "last_name": "Mendoza Prado",
            "dni": "45891021",
            "email": "carlos.mendoza@contratistasperu.pe",
            "position": "Líder Instrumentista",
            "exam_score": 100,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Carlos_Mendoza_2026.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional verificado por Gemini IA. Dictamen: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "Excelente liderazgo y cumplimiento de estándares SSO.",
        },
        {
            "first_name": "Jorge",
            "last_name": "Quispe Rojas",
            "dni": "46102938",
            "email": "jorge.quispe@contratistasperu.pe",
            "position": "Técnico Electricista MT",
            "exam_score": 0,
            "exam_attempts": 0,
            "exam_passed": False,
            "medical_cert_filename": None,
            "medical_cert_status": "PENDIENTE",
            "medical_ai_feedback": None,
            "is_authorized": False,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "",
        },
        {
            "first_name": "Luis",
            "last_name": "Huamán Cueva",
            "dni": "47219304",
            "email": "luis.huaman@contratistasperu.pe",
            "position": "Técnico de Automatización",
            "exam_score": 90,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Luis_Huaman_2026.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": True,
            "faltas_epp_count": 1,
            "observaciones": "Detectado en garita sin guantes dieléctricos durante el turno mañana.",
        },
        {
            "first_name": "Marco",
            "last_name": "Alarcón Silva",
            "dni": "48320195",
            "email": "marco.alarcon@contratistasperu.pe",
            "position": "Montajista Eléctrico",
            "exam_score": 80,
            "exam_attempts": 2,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Marco_Alarcon.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "Cumple con los procedimientos PETS.",
        },
        {
            "first_name": "Fernando",
            "last_name": "Ramos Lozano",
            "dni": "49102847",
            "email": "fernando.ramos@contratistasperu.pe",
            "position": "Instrumentista de Campo",
            "exam_score": 85,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": None,
            "medical_cert_status": "PENDIENTE",
            "medical_ai_feedback": None,
            "is_authorized": False,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "",
        },
        {
            "first_name": "Raúl",
            "last_name": "Espinoza Vargas",
            "dni": "43918273",
            "email": "raul.espinoza@contratistasperu.pe",
            "position": "Ayudante Electricista",
            "exam_score": 80,
            "exam_attempts": 2,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Raul_Espinoza.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": True,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "Retraso en el conexionado de caja de paso #4.",
        },
        {
            "first_name": "Javier",
            "last_name": "Torres Benítez",
            "dni": "44501928",
            "email": "javier.torres@contratistasperu.pe",
            "position": "Técnico Fibra Óptica",
            "exam_score": 100,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Javier_Torres.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "Trabajo impecable en empalmes.",
        },
        {
            "first_name": "Gustavo",
            "last_name": "Chávez Luján",
            "dni": "45617283",
            "email": "gustavo.chavez@contratistasperu.pe",
            "position": "Supervisor HSE Campo",
            "exam_score": 95,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Gustavo_Chavez.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "",
        },
        {
            "first_name": "Wilmer",
            "last_name": "Mamani Quispe",
            "dni": "46728394",
            "email": "wilmer.mamani@contratistasperu.pe",
            "position": "Técnico de Pruebas",
            "exam_score": 90,
            "exam_attempts": 1,
            "exam_passed": True,
            "medical_cert_filename": "EMO_Wilmer_Mamani.pdf",
            "medical_cert_status": "VALIDADA_POR_IA",
            "medical_ai_feedback": "Certificado Médico Ocupacional validado por Gemini IA. Resultado: APTO.",
            "is_authorized": True,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "",
        },
        {
            "first_name": "Ricardo",
            "last_name": "Poma Delgado",
            "dni": "47839405",
            "email": "ricardo.poma@contratistasperu.pe",
            "position": "Operario de Montaje",
            "exam_score": 60,
            "exam_attempts": 1,
            "exam_passed": False,
            "medical_cert_filename": None,
            "medical_cert_status": "PENDIENTE",
            "medical_ai_feedback": None,
            "is_authorized": False,
            "mala_conducta": False,
            "mal_trabajo": False,
            "no_lleva_epps": False,
            "faltas_epp_count": 0,
            "observaciones": "Pendiente de aprobar examen de inducción (>= 80%).",
        },
    ]

    created_workers_s2 = []
    for w_data in squad_2_workers:
        worker = WorkerProfile(proposal_id=proposal_active.id, **w_data)
        db.add(worker)
        db.flush()
        create_worker_account(db, worker)
        created_workers_s2.append(worker)

    # Propuesta #3: ABIERTA para postular cuadrilla
    proposal_open = Proposal(
        title="Sostenimiento Shotcrete y Malla Electrosoldada - Nivel 3400",
        description=(
            "Requerimiento de cuadrilla de 10 operarios para labores de sostenimiento mecanizado, "
            "perforación de pernos helicoidales y lanzado de shotcrete en rampa principal."
        ),
        quota=10,
        start_date="2026-11-10",
        required_epps=required_epps_json,
        status="ABIERTA",
    )
    db.add(proposal_open)
    db.flush()

    if created_workers_s2:
        carlos = created_workers_s2[0]
        luis = created_workers_s2[2]
        db.add(
            AccessLog(
                worker_id=carlos.id,
                worker_name=f"{carlos.first_name} {carlos.last_name}",
                worker_dni=carlos.dni,
                phase="FASE_2_EPP",
                status="VERDE",
                detected_epps=json.dumps([
                    "Casco de Seguridad (HEAD_COVER)",
                    "Guantes de Seguridad (HAND_COVER)",
                    "Protección Facial / Lentes / Mascarilla (FACE_COVER)",
                ]),
                missing_epps=json.dumps([]),
                message="Acceso Concedido en Garita Principal — Todos los EPPs verificados.",
            )
        )
        db.add(
            AccessLog(
                worker_id=luis.id,
                worker_name=f"{luis.first_name} {luis.last_name}",
                worker_dni=luis.dni,
                phase="FASE_2_EPP",
                status="ROJO",
                detected_epps=json.dumps(["Casco de Seguridad (HEAD_COVER)"]),
                missing_epps=json.dumps([
                    "Guantes de Seguridad (HAND_COVER)",
                    "Protección Facial / Lentes / Mascarilla (FACE_COVER)",
                ]),
                message="Acceso Denegado — Falta Guantes y Protección Facial. Se marcó automáticamente 'No lleva sus EPPs'.",
            )
        )

    db.commit()
